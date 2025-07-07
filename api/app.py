# Import required FastAPI components for building the API
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import JSONResponse, PlainTextResponse
from fastapi.middleware.cors import CORSMiddleware
# Import Pydantic for data validation and settings management
from pydantic import BaseModel
# Import OpenAI client for interacting with OpenAI's API
from openai import OpenAI
import os
from typing import Optional, List
from time import time
from aimakerspace.text_utils import PDFLoader, CharacterTextSplitter
from aimakerspace.vectordatabase import VectorDatabase
import uuid
import tempfile
import asyncio
from aimakerspace.openai_utils.embedding import EmbeddingModel
import re

# Initialize FastAPI application with a title
app = FastAPI(title="OpenAI Chat API")

# Configure CORS (Cross-Origin Resource Sharing) middleware
# This allows the API to be accessed from different domains/origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows requests from any origin
    allow_credentials=True,  # Allows cookies to be included in requests
    allow_methods=["*"],  # Allows all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],  # Allows all headers in requests
)

# Define the data model for chat requests using Pydantic
# This ensures incoming request data is properly validated
class ChatRequest(BaseModel):
    user_message: str  # Message from the user
    model: str = "gpt-3.5-turbo"  # Model selection
    api_key: str  # OpenAI API key for authentication

# Replace the Web3-specific system prompt with a generic one
generic_SYSTEM_PROMPT = (
    "You are a helpful, knowledgeable AI assistant. Answer user questions clearly, accurately, and helpfully on any topic."
)

# Define the main chat endpoint that handles POST requests
@app.post("/api/chat", response_class=PlainTextResponse)
async def chat(request: ChatRequest):
    try:
        client = OpenAI(api_key=request.api_key)
        messages = []
        # Always use the generic system prompt
        messages.append({"role": "system", "content": generic_SYSTEM_PROMPT})
        messages.append({"role": "user", "content": request.user_message})
        response = client.chat.completions.create(
            model=request.model,
            messages=messages
        )
        return response.choices[0].message.content
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Define a health check endpoint to verify API status
@app.get("/api/health")
def health():
    return JSONResponse(content={"status": "ok"})

# In-memory store for PDF sessions (session_id -> VectorDatabase)
pdf_sessions = {}

class PDFChatRequest(BaseModel):
    session_id: str
    question: str
    api_key: str
    model: str = "gpt-3.5-turbo"

@app.post("/api/upload_pdf")
async def upload_pdf(file: UploadFile = File(...), api_key: str = Form(...)):
    """
    Accepts a PDF file, extracts text, splits into chunks, builds a vector DB, and returns a session ID, filename, and chunk info.
    """
    os.environ["OPENAI_API_KEY"] = api_key
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            tmp.write(await file.read())
            tmp_path = tmp.name
        loader = PDFLoader(tmp_path)
        texts = loader.load_documents()
        if not texts or not any(t.strip() for t in texts):
            raise HTTPException(status_code=400, detail="No text could be extracted from the PDF.")
        splitter = CharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        chunks = splitter.split_texts(texts)
        if not chunks:
            raise HTTPException(status_code=400, detail="PDF was extracted but no chunks were created.")
        vector_db = VectorDatabase(embedding_model=EmbeddingModel())
        await vector_db.abuild_from_list(chunks)
        session_id = str(uuid.uuid4())
        pdf_sessions[session_id] = {
            'vector_db': vector_db,
            'chunks': chunks,
            'filename': file.filename
        }
        os.remove(tmp_path)
        return {
            "session_id": session_id,
            "filename": file.filename,
            "chunk_size": 1000,
            "chunk_overlap": 200,
            "num_chunks": len(chunks)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF processing failed: {str(e)}")

def extract_keywords(text):
    stopwords = set([
        'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'for', 'by', 'with', 'as', 'that', 'this', 'it', 'from', 'are', 'be', 'was', 'were', 'has', 'have', 'had', 'but', 'not', 'can', 'will', 'would', 'should', 'could', 'i', 'you', 'he', 'she', 'they', 'we', 'my', 'your', 'his', 'her', 'their', 'our', 'what', 'who', 'how', 'when', 'where', 'why', 'so', 'if', 'than', 'then', 'about', 'into', 'out', 'up', 'down', 'over', 'under', 'again', 'further', 'once', 'here', 'there', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'only', 'own', 'same', 'too', 'very', 's', 't', 'just', 'don', 'now'
    ])
    words = re.findall(r'\w+', text.lower())
    return [w for w in words if w not in stopwords and len(w) > 2]

@app.post("/api/pdf_chat", response_class=PlainTextResponse)
async def pdf_chat(request: PDFChatRequest):
    session = pdf_sessions.get(request.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    vector_db = session['vector_db']
    k = 4
    relevant_chunks = vector_db.search_by_text(request.question, k=k, return_as_text=True)
    context = "\n\n".join(relevant_chunks).strip()
    if not context or context.isspace():
        return "Sorry, I could not find relevant information in the uploaded PDF for your question. Please ask something related to the document's content."
    # Compose prompt for OpenAI
    prompt = (
        "You are a helpful, knowledgeable AI assistant. Use the following context to answer the user's question.\n\n"
        f"Context:\n{context}\n\nQuestion: {request.question}\nAnswer:"
    )
    try:
        client = OpenAI(api_key=request.api_key)
        response = client.chat.completions.create(
            model=request.model,
            messages=[{"role": "system", "content": prompt}]
        )
        return response.choices[0].message.content
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"RAG chat failed: {str(e)}")

@app.post("/api/remove_pdf")
def remove_pdf(session_id: str = Query(...)):
    if session_id in pdf_sessions:
        del pdf_sessions[session_id]
        return {"message": "PDF removed from session."}
    else:
        # Idempotent: return 200 even if not found
        return {"message": "PDF already removed or session not found."}

# Entry point for running the application directly
if __name__ == "__main__":
    import uvicorn
    # Start the server on all network interfaces (0.0.0.0) on port 8000
    uvicorn.run(app, host="0.0.0.0", port=8000)
