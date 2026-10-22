# backend/app/main.py
import uuid
from typing import Dict, Any, Optional
from fastapi import FastAPI, UploadFile, File, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ValidationError

# Import vision analyzer and our NEW LangGraph agent
from backend.app.services.vlm_analyzer import analyze_flowchart_image
from backend.app.services.graph_engine import flowchart_agent

app = FastAPI(
    title="Flowchart AI Agent",
    description="Agentic Flowchart Understanding using LangGraph",
    version="0.4.0"
)

# Enable CORS for local frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- API Schemas ---

class UploadResponse(BaseModel):
    success: bool
    session_id: str
    filename: str
    project_data: Dict[str, Any]
    message: str

class ChatRequest(BaseModel):
    session_id: str
    message: str
    architecture: Optional[Dict[str, Any]] = None 


# --- Endpoints ---

@app.get("/")
def home():
    return {
        "status": "online",
        "service": "Flowchart AI Agent API (LangGraph Edition)",
        "version": "0.4.0"
    }


@app.post(
    "/upload",
    response_model=UploadResponse,
    summary="Upload diagram and initialize LangGraph session",
    description="Extracts flowchart logic via VLM, and initializes persistent LangGraph memory."
)
async def upload_flowchart(file: UploadFile = File(...)):
    allowed_types = ["image/png", "image/jpeg", "image/jpg", "image/webp"]
    content_type = file.content_type or "image/png"
    
    if content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type: {content_type}. Please upload a PNG, JPG, or WebP image."
        )

    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file is empty."
        )

    try:
        # Extract the JSON IR from the image
        project_metadata = await analyze_flowchart_image(
            image_bytes=image_bytes,
            mime_type=content_type
        )

        # Generate a unique Session ID (thread_id for LangGraph)
        session_id = uuid.uuid4().hex

        # Initialize the LangGraph memory state for this specific user session
        config = {"configurable": {"thread_id": session_id}}
        flowchart_agent.update_state(config, {"architecture": project_metadata})

        return UploadResponse(
            success=True,
            session_id=session_id,
            filename=file.filename,
            project_data=project_metadata,
            message="Project architecture successfully parsed and saved to LangGraph memory."
        )

    except ValidationError as ve:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"VLM response failed schema validation: {ve.errors()}"
        )
    except RuntimeError as re:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(re)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Flowchart analysis failed: {str(e)}"
        )


@app.post(
    "/chat",
    summary="Context-aware chat using LangGraph",
    description="Talk to the agent about the uploaded project. LangGraph handles the history automatically."
)
async def chat_about_flowchart(payload: ChatRequest):
    try:
        # 1. Point LangGraph to the correct user session memory
        config = {"configurable": {"thread_id": payload.session_id}}
        
        # 2. Package the new user message
        input_state = {"messages": [("user", payload.message)]}
        
        # 3. If the frontend forces an architecture update, inject it
        if payload.architecture:
            input_state["architecture"] = payload.architecture
            
        # 4. Invoke the Graph! (Memory loads, LLM runs, Memory saves)
        result = flowchart_agent.invoke(input_state, config=config)
        
        # 5. Extract the final LLM string response
        final_reply = result["messages"][-1].content
        
        return {
            "reply": final_reply,
            "thought_process": "Graph execution successful. Reasoning handled internally by LLM.", # Placeholder to prevent frontend UI crashes
            "current_architecture": result.get("architecture", {})
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Graph execution failed: {str(e)}"
        )