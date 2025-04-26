FROM python:3.13-slim

WORKDIR /app

COPY . .

RUN pip install -r requirements.txt --no-cache-dir

CMD ["python", "backend/main.py"]