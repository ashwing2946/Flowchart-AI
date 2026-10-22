# 🧠 Flowchart AI Agent

> An enterprise-grade, stateful AI orchestration engine that analyzes architecture flowcharts, understands complex system structures, and lets users converse with & dynamically mutate the architecture — powered by **LangGraph**.

Built as a core component for the **HLB Hamt Central Communication Platform**.

---

## 🚀 Key Features

| Feature | Description |
|---|---|
| **Visual Architecture Parsing** | Upload a system flowchart (PNG / JPG / WebP). A Vision-Language Model extracts a structured JSON representation of modules, processes & dependencies. |
| **LangGraph Orchestration** | Replaces fragile prompt-loops with a robust `StateGraph` engine for deterministic agent execution. |
| **Flawless State Mutation** | LangChain `@tool` bindings let the AI edit the architecture JSON (add/remove components, update dependencies) without leaking raw JSON into the UI. |
| **Persistent Session Memory** | LangGraph `MemorySaver` tied to unique Session IDs — the agent remembers context across multi-turn conversations. |
| **Enterprise-Ready API** | Clean FastAPI backend serving as a stateless gateway to the LangGraph execution environment. |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Backend Framework | **FastAPI** (Python 3.10+) |
| Agent Orchestration | **LangGraph**, **LangChain** (`langchain-openai`) |
| LLM Inference | **vLLM** — `google/gemma-4-12B-it-qat-w4a16-ct` (remote GPU via SSH tunnel) |
| State Management | **LangGraph MemorySaver** |
| Frontend | **React + Vite** (standard REST JSON payloads) |

---

## 📁 Project Structure

```
Flowchart-AI/
├── backend/
│   └── app/
│       ├── main.py                      # FastAPI entry point & API routes
│       ├── schemas.py                   # Pydantic request/response models
│       ├── tunnel_config.py             # 🔒 Confidential (git-ignored)
│       ├── tunnel_config.template.py    # Template for tunnel_config.py
│       └── services/
│           ├── vlm_analyzer.py          # VLM image → JSON extraction
│           └── graph_engine.py          # LangGraph state machine & agent
├── frontend/
│   ├── index.html
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx                      # Main React application
│       ├── index.css                    # Global styles
│       └── main.jsx                     # Vite entry point
├── data/
│   └── images/                          # Sample flowchart images
├── tests/                               # Test suite (WIP)
├── requirements.txt                     # Python dependencies
├── .gitignore
└── README.MD
```

---

## 📦 Installation & Setup

### 1. Clone & Create Virtual Environment

```bash
git clone https://github.com/<your-username>/Flowchart-AI.git
cd Flowchart-AI

python -m venv .venv

# Windows
.\.venv\Scripts\Activate.ps1

# macOS / Linux
source .venv/bin/activate
```

### 2. Install Python Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure the Tunnel (Confidential)

The project connects to a **remote GPU server** via an SSH tunnel. Credentials are stored in a git-ignored config file.

```bash
# Copy the template
cp backend/app/tunnel_config.template.py backend/app/tunnel_config.py
```

Then edit `backend/app/tunnel_config.py` with your actual values:

```python
GPU_SERVER_IP   = "YOUR_GPU_SERVER_IP"
GPU_SERVER_USER = "YOUR_SSH_USERNAME"
LOCAL_TUNNEL_PORT = 8001
MODEL_NAME      = "google/gemma-4-12B-it-qat-w4a16-ct"
```

> ⚠️ **Never commit `tunnel_config.py`** — it is listed in `.gitignore`.

### 4. Start the SSH Tunnel

Open a separate terminal and run:

```bash
ssh -N -L 8001:127.0.0.1:8001 <user>@<GPU_SERVER_IP>
```

This forwards the remote vLLM server to your local port `8001`.

### 5. Launch the Backend

```bash
uvicorn backend.app.main:app --reload
```

The API will be available at **http://localhost:8000**.

### 6. Launch the Frontend

```bash
cd frontend
npm install
npm run dev
```

The UI will be available at **http://localhost:5173**.

---

## 🔌 API Endpoints

### `POST /upload`

Upload a diagram to initialize the AI session.

| Field | Detail |
|---|---|
| **Payload** | `multipart/form-data` — image file (PNG, JPG, WebP) |
| **Action** | Runs the VLM to extract architecture, generates a `session_id`, initialises LangGraph memory state |
| **Returns** | `session_id`, `filename`, `project_data` (JSON architecture tree) |

### `POST /chat`

Converse with the agent to query or modify the architecture.

| Field | Detail |
|---|---|
| **Payload** | `{ "session_id": "string", "message": "string", "architecture": {...} }` (architecture is optional) |
| **Action** | Loads graph memory → processes query → triggers tools if mutation requested → saves new state |
| **Returns** | `reply` (clean text), `current_architecture` (latest JSON) |

### `GET /`

Health check — returns service status and version.

---

## 🔮 Future Roadmap

- [ ] **Multi-Agent Supervisor** — Specialised agents (e.g. a "Validator" that reviews structural changes before committing).
- [ ] **Human-in-the-Loop (HITL)** — LangGraph interrupts for frontend approval before destructive architecture mutations.
- [ ] **Live Webhooks** — Transition tool outputs from JSON mutations to live REST API calls (e.g. provisioning Zoho CRM or Twilio webhooks).
- [ ] **Export & Versioning** — Download architecture snapshots and diff between versions.

---

## 📝 License

This project is proprietary to **HLB Hamt**. All rights reserved.