# backend/app/tunnel_config.py  —  TEMPLATE
# ============================================================
# Copy this file to  tunnel_config.py  and fill in your values.
# tunnel_config.py is git-ignored; this template is NOT.
# ============================================================

# SSH Tunnel target  (the command you run locally):
#   ssh -N -L <LOCAL_TUNNEL_PORT>:127.0.0.1:<LOCAL_TUNNEL_PORT> <GPU_SERVER_USER>@<GPU_SERVER_IP>
GPU_SERVER_IP = "YOUR_GPU_SERVER_IP"
GPU_SERVER_USER = "YOUR_SSH_USERNAME"
LOCAL_TUNNEL_PORT = 8001

# vLLM inference endpoint (exposed through the tunnel)
VLLM_API_URL = f"http://127.0.0.1:{LOCAL_TUNNEL_PORT}/v1/chat/completions"
VLLM_BASE_URL = f"http://127.0.0.1:{LOCAL_TUNNEL_PORT}/v1"

# Model served on the remote GPU
MODEL_NAME = "your-model-name-here"
