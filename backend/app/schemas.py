from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class DecisionBranch(BaseModel):
    condition: Optional[str] = ""
    yes: Optional[str] = ""
    no: Optional[str] = ""

class Analysis(BaseModel):
    summary: Optional[str] = ""
    logic_flow: Optional[Any] = ""  # Accepts either a string or a list of strings
    decision_branches: Optional[List[Dict[str, Any]]] = Field(default_factory=list)

class Node(BaseModel):
    id: Optional[Any] = None
    type: Optional[str] = "process"
    text: Optional[str] = ""

class Connection(BaseModel):
    from_node: Optional[Any] = Field(default=None, alias="from")
    to_node: Optional[Any] = Field(default=None, alias="to")
    label: Optional[str] = ""

    class Config:
        populate_by_name = True

class FlowchartData(BaseModel):
    flowchart_type: Optional[str] = "diagram"
    nodes: Optional[List[Node]] = Field(default_factory=list)
    connections: Optional[List[Connection]] = Field(default_factory=list)
    analysis: Optional[Analysis] = None

class FlowchartUploadResponse(BaseModel):
    success: bool = True
    filename: str
    flowchart_data: FlowchartData
#____
    from_node: Optional[Any] = Field(default=None , alias = "from")
    to_node:  Optional[Any] = Field(default=None , alias=)
    