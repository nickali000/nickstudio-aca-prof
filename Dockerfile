FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    FLASK_ENV=production \
    FLASK_DEBUG=0 \
    NICKSTUDIO_PORT=8085

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

COPY . .

RUN addgroup --system simulator \
    && adduser --system --ingroup simulator simulator \
    && chown -R simulator:simulator /app

USER simulator

EXPOSE 8085

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import os, urllib.request; port=os.environ.get('PORT') or os.environ.get('NICKSTUDIO_PORT', '8085'); urllib.request.urlopen('http://127.0.0.1:%s/healthz' % port, timeout=3).read()"

CMD ["sh", "-c", "gunicorn --bind 0.0.0.0:${PORT:-${NICKSTUDIO_PORT:-8085}} --workers ${NICKSTUDIO_WORKERS:-1} app:app"]
