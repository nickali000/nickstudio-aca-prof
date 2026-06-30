# ACA Table Trainer Simulator

Standalone simulator for Scoreboard, Tomasulo and Tomasulo + ROB exercises.

## Local run

```bash
pip install -r requirements.txt
NICKSTUDIO_PORT=8085 python app.py
```

Open:

```text
http://127.0.0.1:8085/
```

## Render

- Environment: Docker
- Root Directory: leave empty
- Dockerfile Path: `./Dockerfile`
- Docker Context Directory: `.`
- Health Check Path: `/healthz`
- Environment Variables: `NICKSTUDIO_WORKERS=1`
