# Import required FastAPI components for building the API
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import JSONResponse, PlainTextResponse
from fastapi.middleware.cors import CORSMiddleware
# Import Pydantic for data validation and settings management
from pydantic import BaseModel
# Import OpenAI client for interacting with OpenAI's API
from openai import OpenAI
from typing import Optional, List
from time import time
import uuid
import tempfile
import asyncio
import re
import os

# Initialize FastAPI application with a title
app = FastAPI(title="OpenAI Chat API")

# Configure CORS (Cross-Origin Resource Sharing) middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows requests from any origin
    allow_credentials=True,  # Allows cookies to be included in requests
    allow_methods=["*"],  # Allows all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],  # Allows all headers in requests
)

# Try to import aimakerspace modules with detailed error handling
AIMAKERSPACE_AVAILABLE = False
IMPORT_ERROR_MESSAGE = ""

try:
    from aimakerspace.text_utils import PDFLoader, CharacterTextSplitter
    from aimakerspace.vectordatabase import VectorDatabase
    from aimakerspace.openai_utils.embedding import EmbeddingModel
    AIMAKERSPACE_AVAILABLE = True
    print("✅ aimakerspace modules imported successfully")
except ImportError as e:
    IMPORT_ERROR_MESSAGE = str(e)
    print(f"⚠️ Warning: Could not import aimakerspace modules: {e}")
    print("📝 PDF functionality will be disabled, but basic chat will work")
except Exception as e:
    IMPORT_ERROR_MESSAGE = str(e)
    print(f"❌ Error importing aimakerspace modules: {e}")
    print("📝 PDF functionality will be disabled, but basic chat will work")

# Define the data model for chat requests using Pydantic
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
    return JSONResponse(content={
        "status": "ok",
        "aimakerspace_available": AIMAKERSPACE_AVAILABLE,
        "import_error": IMPORT_ERROR_MESSAGE if not AIMAKERSPACE_AVAILABLE else None,
        "endpoints": {
            "chat": "✅ Available",
            "pdf_upload": "✅ Available" if AIMAKERSPACE_AVAILABLE else "❌ Disabled (aimakerspace not available)",
            "pdf_chat": "✅ Available" if AIMAKERSPACE_AVAILABLE else "❌ Disabled (aimakerspace not available)"
        }
    })

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
    if not AIMAKERSPACE_AVAILABLE:
        raise HTTPException(
            status_code=503, 
            detail=f"PDF processing functionality is not available. Import error: {IMPORT_ERROR_MESSAGE}"
        )
    
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
        splitter = CharacterTextSplitter(
            chunk_size=1500,     # Increased from 1000 for better context
            chunk_overlap=375    # 25% overlap for better boundary preservation
        )
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
            "chunk_size": 1500,      # Updated to reflect new size
            "chunk_overlap": 375,    # Updated to reflect new overlap
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
    if not AIMAKERSPACE_AVAILABLE:
        raise HTTPException(
            status_code=503, 
            detail=f"PDF chat functionality is not available. Import error: {IMPORT_ERROR_MESSAGE}"
        )
    
    session = pdf_sessions.get(request.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    vector_db = session['vector_db']
    filename = session['filename']
    
    # Adaptive retrieval: more chunks for complex questions
    def get_retrieval_count(question: str) -> int:
        word_count = len(question.split())
        question_marks = question.count('?')
        
        # More chunks for complex questions
        if word_count > 15 or question_marks > 1:
            return 6
        elif word_count > 8:
            return 5
        return 4
    
    k = get_retrieval_count(request.question)
    relevant_chunks = vector_db.search_by_text(request.question, k=k, return_as_text=True)
    context = "\n\n".join(relevant_chunks).strip()
    
    # Enhanced context validation
    if not context or context.isspace():
        return f"❌ **Out of Context Question**\n\nI couldn't find any relevant information in the uploaded document '{filename}' to answer your question. Please ask questions related to the content of the document you uploaded."
    
    # Check for context relevance using keyword overlap
    def is_context_relevant(question: str, context: str, min_relevance_score: float = 0.1) -> bool:
        question_keywords = set(extract_keywords(question))
        context_keywords = set(extract_keywords(context))
        
        if not question_keywords:
            return True  # If no keywords extracted, allow the question
            
        # Calculate keyword overlap ratio
        overlap = len(question_keywords.intersection(context_keywords))
        relevance_score = overlap / len(question_keywords)
        
        return relevance_score >= min_relevance_score
    
    # Validate if the retrieved context is actually relevant to the question
    if not is_context_relevant(request.question, context):
        return f"❌ **Out of Context Question**\n\nYour question appears to be outside the scope of the uploaded document '{filename}'. The document doesn't contain information relevant to your query. Please ask questions about the content that's actually in the document."
    
    # Enhanced prompt with explicit context boundary instruction
    prompt = (
        f"You are a helpful AI assistant answering questions ONLY based on the provided context from the document '{filename}'. "
        "IMPORTANT INSTRUCTIONS:\n"
        "- If the question cannot be answered using the provided context, respond with: 'This question is outside the scope of the uploaded document.'\n"
        "- Only use information from the context below to answer questions\n"
        "- Do not use external knowledge or make assumptions beyond what's in the context\n"
        "- If the context doesn't contain enough information to fully answer the question, say so explicitly\n\n"
        f"Context from document '{filename}':\n{context}\n\n"
        f"Question: {request.question}\n\n"
        "Answer based ONLY on the provided context:"
    )
    
    try:
        client = OpenAI(api_key=request.api_key)
        response = client.chat.completions.create(
            model=request.model,
            messages=[{"role": "system", "content": prompt}],
            temperature=0.1  # Lower temperature for more focused, context-based responses
        )
        
        answer = response.choices[0].message.content
        
        # Post-process response to catch if the model still tries to answer out-of-context
        out_of_context_indicators = [
            "this question is outside the scope",
            "outside the scope of the uploaded document",
            "not enough information in the context",
            "cannot be answered using the provided context",
            "the context doesn't contain",
            "based on the provided context, i cannot"
        ]
        
        if any(indicator in answer.lower() for indicator in out_of_context_indicators):
            return f"❌ **Out of Context Question**\n\nYour question cannot be answered based on the content of the uploaded document '{filename}'. Please ask questions that relate to the information actually contained in the document."
        
        return answer
        
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
