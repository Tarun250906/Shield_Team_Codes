FROM python:3.11-slim

WORKDIR /app

# System library required by some ML packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Copy the application, frontend and trained model artifacts
COPY . .

# FastAPI port
EXPOSE 8000

# Start the API; cloud platforms can supply their own PORT
CMD ["sh", "-c", "uvicorn api:app --host 0.0.0.0 --port ${PORT:-8000}"]