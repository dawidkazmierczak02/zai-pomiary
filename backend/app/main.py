from fastapi import FastAPI

# Główny obiekt aplikacji
app = FastAPI(title="ZAI – Serie pomiarowe", version="1.0.0")


@app.get("/api/health", tags=["system"])
def health():
    """Sprawdzenie dostępności aplikacji (wymagane przez kontrakt)."""
    return {"status": "ok"}