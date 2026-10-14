# AI SignBridge - Backend API

FastAPI modular application factory with Pydantic v2 settings, health monitoring, and async test suites.

## Setup & Running with uv (CachyOS / Linux)

```bash
# Create and activate virtual environment with Python 3.12
cd backend
uv venv --python 3.12
source .venv/bin/activate   # or activate.fish in fish shell

# Install dependencies in editable mode with dev tools
uv pip install -e ".[dev]"

# Run tests
pytest -v

# Run backend development server
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
