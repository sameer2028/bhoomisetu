from fastapi import FastAPI

app = FastAPI(title="Land Acquisition AI Service")

@app.get("/health")
def health_check():
    return {"status": "AI service running"}