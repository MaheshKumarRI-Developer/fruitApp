from fastapi import FastAPI
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer

app = FastAPI()

model = SentenceTransformer(
    "BAAI/bge-small-en-v1.5"
)

class EmbeddingRequest(BaseModel):
    text: str

@app.post("/embed")
def embed(request: EmbeddingRequest):

    embedding = model.encode(
        request.text
    ).tolist()

    return {
        "embedding": embedding
    }
