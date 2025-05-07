FROM node:24-slim AS builder

WORKDIR /app

COPY . .

RUN cd frontend && \
    npm install --legacy-peer-deps --no-audit --progress=false --prefer-offline && \
    npm run build

FROM python:3.13-slim

WORKDIR /app

COPY . .

COPY --from=builder /app/frontend/dist ./frontend/dist

RUN pip install -r requirements.txt --no-cache-dir

CMD ["python", "backend/main.py"]