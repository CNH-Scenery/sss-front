# Tacit Trader Backend

FastAPI backend for the Tacit Trader frontend MVP.

## Local Development

```powershell
cd backend
python -m pip install -e .[dev]
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

## Test

```powershell
cd backend
python -m pytest
```

The default API base URL is `http://127.0.0.1:8000`, and the frontend origin allowed by CORS is `http://localhost:5173`.
