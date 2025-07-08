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
import logging

# Initialize logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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
    from aimakerspace.multi_format_loader import MultiFormatLoader
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
            "file_upload": "✅ Available" if AIMAKERSPACE_AVAILABLE else "❌ Disabled (aimakerspace not available)",
            "file_chat": "✅ Available" if AIMAKERSPACE_AVAILABLE else "❌ Disabled (aimakerspace not available)"
        },
        "supported_formats": MultiFormatLoader.get_supported_formats() if AIMAKERSPACE_AVAILABLE else {}
    })

# In-memory store for file sessions (session_id -> VectorDatabase)
file_sessions = {}

class FileChatRequest(BaseModel):
    session_id: str
    question: str
    api_key: str
    model: str = "gpt-3.5-turbo"

@app.post("/api/upload_file")
async def upload_file(file: UploadFile = File(...), api_key: str = Form(...)):
    """
    Accepts various file formats (PDF, DOCX, TXT, HTML, JSON, YAML, CSV, code files, etc.),
    extracts text, splits into chunks, builds a vector DB, and returns session info.
    """
    if not AIMAKERSPACE_AVAILABLE:
        raise HTTPException(
            status_code=503, 
            detail=f"File processing functionality is not available. Import error: {IMPORT_ERROR_MESSAGE}"
        )
    
    os.environ["OPENAI_API_KEY"] = api_key
    
    # Get supported file extensions
    supported_extensions = MultiFormatLoader.get_supported_extensions()
    file_extension = file.filename.split('.')[-1].lower() if '.' in file.filename else ''
    
    if file_extension not in supported_extensions:
        supported_list = ', '.join([f".{ext}" for ext in sorted(supported_extensions)])
        raise HTTPException(
            status_code=400, 
            detail=f"The file format '.{file_extension}' is not supported. We support these file types: {supported_list}. Please upload a file in one of these formats."
        )
    
    try:
        # Save uploaded file to temporary location
        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{file_extension}") as tmp:
            tmp.write(await file.read())
            tmp_path = tmp.name
        
        # Load file using MultiFormatLoader
        loader = MultiFormatLoader(tmp_path)
        
        # Get file information
        file_info = loader.get_file_info()
        logger.info(f"Processing file: {file_info}")
        
        # Extract text from file
        texts = loader.load()
        
        if not texts or not any(t.strip() for t in texts):
            raise HTTPException(status_code=400, detail=f"No readable text could be extracted from this {file_extension.upper()} file. The file may be empty, corrupted, or contain only images/non-text content.")
        
        # Split texts into chunks
        splitter = CharacterTextSplitter(
            chunk_size=1500,     # Increased from 1000 for better context
            chunk_overlap=375    # 25% overlap for better boundary preservation
        )
        chunks = splitter.split_texts(texts)
        
        if not chunks:
            raise HTTPException(status_code=400, detail=f"The file was processed but couldn't be divided into readable sections. The content may be too short or improperly formatted.")
        
        # Build vector database
        vector_db = VectorDatabase(embedding_model=EmbeddingModel())
        await vector_db.abuild_from_list(chunks)
        
        # Store session
        session_id = str(uuid.uuid4())
        file_sessions[session_id] = {
            'vector_db': vector_db,
            'chunks': chunks,
            'filename': file.filename,
            'file_type': file_extension,
            'file_info': file_info
        }
        
        # Clean up temporary file
        os.remove(tmp_path)
        
        return {
            "session_id": session_id,
            "filename": file.filename,
            "file_type": file_extension,
            "file_description": file_info['description'],
            "chunk_size": 1500,
            "chunk_overlap": 375,
            "num_chunks": len(chunks),
            "supported_formats": MultiFormatLoader.get_supported_formats()
        }
        
    except ValueError as e:
        # Clean up temporary file in case of error
        if 'tmp_path' in locals() and os.path.exists(tmp_path):
            os.remove(tmp_path)
        # ValueError contains user-friendly messages from MultiFormatLoader
        raise HTTPException(status_code=400, detail=str(e))
    except FileNotFoundError:
        # Clean up temporary file in case of error
        if 'tmp_path' in locals() and os.path.exists(tmp_path):
            os.remove(tmp_path)
        raise HTTPException(status_code=400, detail="The uploaded file could not be found or accessed. Please try uploading again.")
    except PermissionError:
        # Clean up temporary file in case of error
        if 'tmp_path' in locals() and os.path.exists(tmp_path):
            os.remove(tmp_path)
        raise HTTPException(status_code=400, detail="Unable to access the uploaded file. Please check file permissions and try again.")
    except MemoryError:
        # Clean up temporary file in case of error
        if 'tmp_path' in locals() and os.path.exists(tmp_path):
            os.remove(tmp_path)
        raise HTTPException(status_code=413, detail="The file is too large to process. Please try uploading a smaller file.")
    except Exception as e:
        # Clean up temporary file in case of error
        if 'tmp_path' in locals() and os.path.exists(tmp_path):
            os.remove(tmp_path)
        logger.error(f"Unexpected error processing file: {str(e)}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred while processing your file. Please try again or contact support if the problem persists.")

def extract_keywords(text):
    stopwords = set([
        'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'for', 'by', 'with', 'as', 'that', 'this', 'it', 'from', 'are', 'be', 'was', 'were', 'has', 'have', 'had', 'but', 'not', 'can', 'will', 'would', 'should', 'could', 'i', 'you', 'he', 'she', 'they', 'we', 'my', 'your', 'his', 'her', 'their', 'our', 'what', 'who', 'how', 'when', 'where', 'why', 'so', 'if', 'than', 'then', 'about', 'into', 'out', 'up', 'down', 'over', 'under', 'again', 'further', 'once', 'here', 'there', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'only', 'own', 'same', 'too', 'very', 's', 't', 'just', 'don', 'now'
    ])
    words = re.findall(r'\w+', text.lower())
    return [w for w in words if w not in stopwords and len(w) > 2]

@app.post("/api/file_chat", response_class=PlainTextResponse)
async def file_chat(request: FileChatRequest):
    if not AIMAKERSPACE_AVAILABLE:
        raise HTTPException(
            status_code=503, 
            detail=f"File chat functionality is not available. Import error: {IMPORT_ERROR_MESSAGE}"
        )
    
    session = file_sessions.get(request.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    vector_db = session['vector_db']
    filename = session['filename']
    file_type = session.get('file_type', 'file')
    chunks = session['chunks']
    
    # Detect broad questions that should see the entire document
    def is_broad_question(question: str) -> bool:
        broad_patterns = [
            'everything about', 'all about', 'entire', 'whole', 'complete',
            'summarize', 'summary', 'overview', 'explain the file', 'what is the file',
            'what does the file', 'describe the file', 'tell me about the file',
            'what is this file', 'what is this document', 'explain this file',
            'explain this document', 'describe this document', 'list', 'show',
            'provide', 'give me', 'display', 'print', 'output', 'content',
            'code', 'text', 'data', 'information', 'details',
            'what is the file all about', 'what is this file all about',
            'what is the document all about', 'what is this document all about',
            'file all about', 'document all about', 'about the file',
            'about this file', 'about the document', 'about this document'
        ]
        question_lower = question.lower()
        return any(pattern in question_lower for pattern in broad_patterns)
    
    # Check if this is a content request (asking for file contents)
    def is_content_request(question: str) -> bool:
        content_patterns = [
            'list', 'show', 'provide', 'give me', 'display', 'print', 'output',
            'entire code', 'all code', 'full code', 'complete code', 'whole code',
            'entire content', 'all content', 'full content', 'complete content',
            'entire file', 'all file', 'full file', 'whole file'
        ]
        question_lower = question.lower()
        return any(pattern in question_lower for pattern in content_patterns)
    
    # Adaptive retrieval: more chunks for complex questions
    def get_retrieval_count(question: str) -> int:
        if is_broad_question(question) or is_content_request(question):
            # For broad questions or content requests, return more chunks or all chunks if small
            return min(len(chunks), 15)  # Increased to 15 chunks for better coverage
        
        word_count = len(question.split())
        question_marks = question.count('?')
        
        # More chunks for complex questions
        if word_count > 15 or question_marks > 1:
            return 6
        elif word_count > 8:
            return 5
        return 4
    
    k = get_retrieval_count(request.question)
    
    # For broad questions or content requests, use different search strategy
    if is_broad_question(request.question) or is_content_request(request.question):
        if len(chunks) <= 15:
            # If small/medium file, use all chunks
            relevant_chunks = chunks
        else:
            # For larger files, get diverse chunks using multiple search terms
            search_terms = ['main', 'function', 'class', 'important', 'key', 'contract', 'method']
            all_relevant = []
            for term in search_terms:
                term_chunks = vector_db.search_by_text(f"{request.question} {term}", k=3, return_as_text=True)
                all_relevant.extend(term_chunks)
            # Remove duplicates while preserving order
            seen = set()
            relevant_chunks = []
            for chunk in all_relevant:
                if chunk not in seen:
                    seen.add(chunk)
                    relevant_chunks.append(chunk)
            # If still no good results, fall back to first chunks
            if len(relevant_chunks) < 5:
                relevant_chunks = chunks[:k]
    else:
        # Use normal vector search for specific questions
        relevant_chunks = vector_db.search_by_text(request.question, k=k, return_as_text=True)
    
    context = "\n\n".join(relevant_chunks).strip()
    
    # Enhanced context validation
    if not context or context.isspace():
        return f"❌ **Out of Context Question**\n\nI couldn't find any relevant information in the uploaded {file_type.upper()} file '{filename}' to answer your question. Please ask questions related to the content of the file you uploaded."
    
    # Check for context relevance using keyword overlap
    def is_context_relevant(question: str, context: str, min_relevance_score: float = 0.1) -> bool:
        # Always allow broad questions and content requests - these are inherently relevant
        if is_broad_question(question) or is_content_request(question):
            return True
        
        # Allow common document operations without strict keyword matching
        common_operations = [
            'summarize', 'summary', 'explain', 'describe', 'what is', 'what are', 
            'tell me about', 'overview', 'main points', 'key points', 'discuss',
            'analyze', 'review', 'outline', 'list', 'show me', 'give me',
            'everything about', 'all about', 'entire', 'whole', 'complete',
            'how does', 'how do', 'what does', 'what do', 'why does', 'why do'
        ]
        
        question_lower = question.lower()
        if any(op in question_lower for op in common_operations):
            return True
            
        question_keywords = set(extract_keywords(question))
        context_keywords = set(extract_keywords(context))
        
        if not question_keywords:
            return True  # If no keywords extracted, allow the question
            
        # Calculate keyword overlap ratio with more lenient threshold
        overlap = len(question_keywords.intersection(context_keywords))
        relevance_score = overlap / len(question_keywords)
        
        return relevance_score >= min_relevance_score
    
    # Validate if the retrieved context is actually relevant to the question
    if not is_context_relevant(request.question, context):
        return f"❌ **Out of Context Question**\n\nYour question appears to be outside the scope of the uploaded {file_type.upper()} file '{filename}'. The file doesn't contain information relevant to your query. Please ask questions about the content that's actually in the file."
    
    # Enhanced prompt with explicit context boundary instruction
    prompt = (
        f"You are a helpful AI assistant answering questions ONLY based on the provided context from the {file_type.upper()} file '{filename}'. "
        "IMPORTANT INSTRUCTIONS:\n"
        "- If the question cannot be answered using the provided context, respond with: 'This question is outside the scope of the uploaded file.'\n"
        "- Only use information from the context below to answer questions\n"
        "- Do not use external knowledge or make assumptions beyond what's in the context\n"
        "- If the context doesn't contain enough information to fully answer the question, say so explicitly\n\n"
        f"Context from {file_type.upper()} file '{filename}':\n{context}\n\n"
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
            "outside the scope of the uploaded file",
            "outside the scope of the uploaded document",
            "not enough information in the context",
            "cannot be answered using the provided context",
            "the context doesn't contain",
            "based on the provided context, i cannot"
        ]
        
        if any(indicator in answer.lower() for indicator in out_of_context_indicators):
            return f"❌ **Out of Context Question**\n\nYour question cannot be answered based on the content of the uploaded {file_type.upper()} file '{filename}'. Please ask questions that relate to the information actually contained in the file."
        
        return answer
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"RAG chat failed: {str(e)}")

@app.post("/api/remove_file")
def remove_file(session_id: str = Query(...)):
    if session_id in file_sessions:
        del file_sessions[session_id]
        return {"message": "File removed from session."}
    else:
        # Idempotent: return 200 even if not found
        return {"message": "File already removed or session not found."}

# Entry point for running the application directly
if __name__ == "__main__":
    import uvicorn
    # Start the server on all network interfaces (0.0.0.0) on port 8000
    uvicorn.run(app, host="0.0.0.0", port=8000)
