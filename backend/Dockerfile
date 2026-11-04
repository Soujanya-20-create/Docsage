FROM python:3.12-slim

# Tesseract is what reads scanned PDFs and images.
RUN apt-get update \
    && apt-get install -y --no-install-recommends tesseract-ocr tesseract-ocr-eng \
    && rm -rf /var/lib/apt/lists/*

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    FASTEMBED_CACHE_PATH=/opt/models

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

# Bake the embedding model into the image so the first request does not download it.
RUN python -c "from fastembed import TextEmbedding; TextEmbedding('BAAI/bge-small-en-v1.5')"

COPY docsage ./docsage
COPY migrations ./migrations
RUN useradd --create-home app && mkdir -p /app/uploads && chown -R app /app /opt/models
USER app

# One worker on purpose: the keyword index, rate limiter and in-memory vectors are per process.
# Render and Railway inject $PORT.
CMD ["sh", "-c", "uvicorn docsage.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
