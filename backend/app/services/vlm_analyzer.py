import base64
import json
import re
import io
import httpx
from PIL import Image
from typing import List, Dict, Any
from pydantic import BaseModel, Field

from backend.app.tunnel_config import VLLM_API_URL, MODEL_NAME

# --- 1. PYDANTIC SCHEMA ---
class Module(BaseModel):
    name: str = Field(..., description="Name of the phase or module")
    role: str = Field(..., description="What this section handles")
    components: List[str] = Field(default_factory=list, description="Major components in this module")

class ProjectArchitecture(BaseModel):
    project_name: str = Field(default="Unknown Project", description="Inferred or explicit project title")
    project_purpose: str = Field(default="Not specified", description="1-3 sentences on what problem this system solves")
    architecture_type: str = Field(default="General Workflow", description="e.g., Microservices, Event-Driven, State Machine")
    major_modules: List[Module] = Field(default_factory=list)
    data_flow: str = Field(default="Not specified", description="High-level summary of data/control flow")
    external_dependencies: List[str] = Field(default_factory=list)

# --- 2. UPDATED PROMPT ---
PROMPT_TEMPLATE = """You are a strict, literal architecture extraction engine. Analyze the provided flowchart image and output a structured JSON Intermediate Representation (IR).

CRITICAL EXTRACTION RULES:
1. NO PARAPHRASING: You must transcribe the exact text written inside every node and label. If a node lists "PDF, Excel, Image", output exactly those three. Do not infer or add unlisted formats like "Word" or "CSV".
2. DECISION BRANCHES: When analyzing conditional nodes (e.g., "New Customer?"), you must explicitly map the exact outcomes for the literal "Yes" branch and the literal "No" branch. Do not invert or assume standard business logic; read the specific lines.
3. ZERO INFERENCE: Do not invent integrations, CRM functionalities, or automated steps that are not explicitly drawn or written in the image. If it is not on the screen, it does not exist in the architecture.
4. PHASE SEPARATION: Treat different colored pipelines or phases (e.g., Phase 1 vs Phase 2) as distinct workflows. Accurately capture where data is a "Pull" versus a "Push".

Format the output ONLY as a valid JSON object representing the system's architecture.
Do not include any conversational text. Use this exact schema:
{
  "project_name": "string",
  "project_purpose": "string",
  "architecture_type": "string",
  "major_modules": [{"name": "string", "role": "string", "components": ["string"]}],
  "data_flow": "string",
  "external_dependencies": ["string"]
}"""

# --- 3. RESILIENT JSON CLEANER ---
def extract_and_clean_json(raw_text: str) -> Dict[str, Any]:
    """Extracts JSON object from text by slicing from the first '{' to the last '}'."""
    start_idx = raw_text.find('{')
    end_idx = raw_text.rfind('}')
    
    if start_idx != -1 and end_idx != -1:
        json_str = raw_text[start_idx:end_idx+1]
        try:
            return json.loads(json_str)
        except json.JSONDecodeError as e:
            print(f"Failed to parse extracted JSON: {e}")
            pass
            
    return {}

    # Truncation recovery: find the last closing brace that might form a valid object
    last_brace = cleaned.rfind('}')
    if last_brace != -1:
        try:
            return json.loads(cleaned[:last_brace+1])
        except json.JSONDecodeError:
            pass
            
    return {}

# --- 4. MAIN ANALYZER FUNCTION ---
async def analyze_flowchart_image(image_bytes: bytes, mime_type: str = "image/png") -> dict:
    # Preserve legible text on wide architecture diagrams up to 2048px
    image = Image.open(io.BytesIO(image_bytes))
    image.thumbnail((2048,2048), Image.Resampling.LANCZOS)

    buffer = io.BytesIO()
    image.convert("RGB").save(buffer, format="JPEG", quality=90)
    encoded_image = base64.b64encode(buffer.getvalue()).decode("utf-8")
    data_url = f"data:image/jpeg;base64,{encoded_image}"

    payload = {
        "model": MODEL_NAME,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": PROMPT_TEMPLATE},
                    {"type": "image_url", "image_url": {"url": data_url}}
                ]
            }
        ],
        "temperature": 0.2, # Low temp for structured reasoning
        "max_tokens": 4096  # Kept high to prevent truncation on large architectures
    }

    try:
        # 120 second timeout for high-resolution vision encoding
        async with httpx.AsyncClient(timeout=300.0) as client:
            response = await client.post(VLLM_API_URL, json=payload)
            response.raise_for_status()
            data = response.json()

        raw_content = data["choices"][0]["message"]["content"]
        
        # Clean the response and handle potential truncation
        raw_dict = extract_and_clean_json(raw_content)
        
        if not raw_dict:
             raise ValueError(f"Failed to parse VLM response as JSON. Raw response: {raw_content}")
             
        # Validate through Pydantic to ensure the structure is strictly enforced
        validated_project = ProjectArchitecture(**raw_dict)
        return validated_project.model_dump()

    except httpx.ConnectError:
        raise RuntimeError(
            "Could not connect to the GPU inference server at [http://127.0.0.1:8001](http://127.0.0.1:8001). "
            "Please verify that your SSH tunnel is active."
        )
    except Exception as e:
        raise RuntimeError(f"VLM inference failed: {str(e)}") from e