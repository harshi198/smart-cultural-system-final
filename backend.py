
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import os
from google import genai
from google.genai import types

app = FastAPI(title="BharatKatha AI Backend")

# Configuration (Assuming environment variables are set)
API_KEY = os.getenv("API_KEY")
client = genai.Client(api_key=API_KEY)

class StoryRequest(BaseModel):
    title: str
    region: str
    summary: str
    target_language: str

class StoryResponse(BaseModel):
    full_narration: str
    emotion: str
    intensity: int
    cultural_nuances: List[str]
    historical_context: str
    significance: str

@app.post("/api/expand-story", response_model=StoryResponse)
async def expand_story(request: StoryRequest):
    """
    ML Layer: Expands a story summary into a 5-minute detailed narrative.
    """
    prompt = f"""
    Expand this Indian folk story from {request.region} into a long-form narration (800-1000 words).
    Title: {request.title}
    Summary: {request.summary}
    Target Language: {request.target_language}
    
    Ensure the narration is atmospheric, engaging, and culturally grounded.
    """
    
    try:
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema={
                    "type": "OBJECT",
                    "properties": {
                        "full_narration": {"type": "STRING"},
                        "emotion": {"type": "STRING"},
                        "intensity": {"type": "INTEGER"},
                        "cultural_nuances": {"type": "ARRAY", "items": {"type": "STRING"}},
                        "historical_context": {"type": "STRING"},
                        "significance": {"type": "STRING"}
                    }
                }
            )
        )
        return response.parsed
    except Exception as e:
        throw HTTPException(status_code=500, detail=str(e))

@app.post("/api/synthesize-audio")
async def synthesize_audio(text: str, language: str):
    """
    AI Processing Layer: Converts expanded narrative to high-quality regional speech.
    """
    # This mirrors the frontend generateSpeech logic but runs on the server
    # for better resource management and potential caching.
    pass

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
