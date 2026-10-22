import json
from typing import TypedDict, Annotated, Dict, Any
from langgraph.graph.message import add_messages
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage

from backend.app.tunnel_config import VLLM_BASE_URL, MODEL_NAME

# --- 1. DEFINE THE STATE ---
class FlowchartState(TypedDict):
    # Automatically manages and appends chat history
    messages: Annotated[list, add_messages]
    
    # Holds your live JSON flowchart blueprint
    architecture: Dict[str, Any]

# --- 2. CONNECT TO LOCAL VLM ---
llm = ChatOpenAI(
    base_url=VLLM_BASE_URL,
    api_key="not-needed",
    model=MODEL_NAME,
    temperature=0.2
)

# --- 3. DEFINE THE LOGIC NODE ---
def chat_node(state: FlowchartState):
    """Analyzes the prompt and generates a response based on the architecture."""
    current_arch = state.get("architecture", {})
    
    # We give the LLM the exact context and strict formatting rules
    system_prompt = f"""You are an AI architect managing a system with this current architecture:
{json.dumps(current_arch, indent=2)}
    
Answer the user's question clearly. If they ask for a document (like a BRD), output it in pure plain text with proper spacing. 
CRITICAL RULES:
1. Do NOT output raw JSON.
2. Do NOT use Markdown formatting (no asterisks **, no hash symbols ###, no table pipes |). 
3. Use standard text spacing, capital letters, and numbered lists (1., 2.) only."""
    
    # Combine the system prompt with the user's chat history
    messages = [SystemMessage(content=system_prompt)] + state["messages"]
    
    # Call the base LLM (without tools) to ensure clean text generation
    response = llm.invoke(messages)
    
    # LangGraph automatically appends this to the 'messages' list in the state
    return {"messages": [response]}

# --- 4. WIRE THE GRAPH ---
workflow = StateGraph(FlowchartState)

# Add our node
workflow.add_node("agent", chat_node)

# Define the flow
workflow.add_edge(START, "agent")
workflow.add_edge("agent", END)

# Add persistent memory (saves chat history per session_id)
memory = MemorySaver()

# Compile the graph into an executable agent
flowchart_agent = workflow.compile(checkpointer=memory)