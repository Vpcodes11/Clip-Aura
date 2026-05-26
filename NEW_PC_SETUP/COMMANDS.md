# Command Reference

## Repo

```powershell
git clone https://github.com/Vpcodes11/Clip-Aura.git
cd Clip-Aura
git pull origin main
git status
```

## Environment

```powershell
Copy-Item .env.example .env
python scripts/check_env_contract.py
```

## Docker App

```powershell
docker compose up --build
docker compose ps
docker compose logs -f web
docker compose logs -f worker
docker compose down
```

## Backend Without Docker

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.api.main:app --reload --host 0.0.0.0 --port 8000
```

Run the worker in another activated terminal:

```powershell
celery -A app.workers.celery_app worker --loglevel=info --soft-time-limit=540 --time-limit=600
```

## Frontend

```powershell
cd frontend
npm install
npm run dev
npm run build
```

## Tests

```powershell
pytest tests -q
cd frontend
npm run lint
```
