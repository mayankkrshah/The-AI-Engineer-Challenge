# Import required FastAPI components for building the API
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
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
    system_prompt: str  # Custom system/developer message
    user_message: str  # Message from the user
    model: str = "gpt-3.5-turbo"  # Model selection
    api_key: str  # OpenAI API key for authentication

# Define the main chat endpoint that handles POST requests
@app.post("/api/chat", response_class=PlainTextResponse)
async def chat(request: ChatRequest):
    try:
        # For OpenAI 1.12.0, we need to use the correct initialization
        client = OpenAI(api_key=request.api_key)
        messages = []
        
        # Add system prompt
        if request.system_prompt:
            messages.append({"role": "system", "content": request.system_prompt})
        else:
            # Default system prompt for better formatting
            messages.append({"role": "system", "content": "You are a helpful AI assistant. When providing mathematical explanations, use clear, readable text format rather than LaTeX notation. For example, write '3 packs' instead of mathematical notation. Keep responses conversational and easy to understand."})
        
        # Add user message
        messages.append({"role": "user", "content": request.user_message})
        
        # Use the correct API call for OpenAI 1.12.0
        response = client.chat.completions.create(
            model=request.model,
            messages=messages
        )
        
        # Return only the string content, not the raw response object
        return response.choices[0].message.content
    except Exception as e:
        # Return a more detailed error for debugging
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
async def upload_pdf(file: UploadFile = File(...)):
    """
    Accepts a PDF file, extracts text, splits into chunks, builds a vector DB, and returns a session ID.
    """
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    try:
        # Save uploaded file to a temp location
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            tmp.write(await file.read())
            tmp_path = tmp.name
        # Extract text from PDF
        loader = PDFLoader(tmp_path)
        texts = loader.load_documents()
        splitter = CharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        chunks = splitter.split_texts(texts)
        # Build vector DB asynchronously
        vector_db = VectorDatabase()
        await vector_db.abuild_from_list(chunks)
        # Store in session
        session_id = str(uuid.uuid4())
        pdf_sessions[session_id] = {
            'vector_db': vector_db,
            'chunks': chunks
        }
        # Clean up temp file
        os.remove(tmp_path)
        return {"session_id": session_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF processing failed: {str(e)}")

@app.post("/api/pdf_chat", response_class=PlainTextResponse)
async def pdf_chat(request: PDFChatRequest):
    """
    Accepts a question and session_id, performs RAG over the PDF, and returns an answer.
    """
    session = pdf_sessions.get(request.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    vector_db = session['vector_db']
    chunks = session['chunks']
    # Retrieve top-k relevant chunks
    k = 4
    relevant_chunks = vector_db.search_by_text(request.question, k=k, return_as_text=True)
    context = "\n\n".join(relevant_chunks)
    # Compose prompt for OpenAI
    prompt = f"You are an AI assistant. Use the following PDF context to answer the user's question.\n\nContext:\n{context}\n\nQuestion: {request.question}\nAnswer:"
    try:
        client = OpenAI(api_key=request.api_key)
        response = client.chat.completions.create(
            model=request.model,
            messages=[{"role": "system", "content": prompt}]
        )
        return response.choices[0].message.content
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"RAG chat failed: {str(e)}")

# Entry point for running the application directly
if __name__ == "__main__":
    import uvicorn
    # Start the server on all network interfaces (0.0.0.0) on port 8000
    uvicorn.run(app, host="0.0.0.0", port=8000)
