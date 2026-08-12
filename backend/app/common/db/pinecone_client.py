"""Pinecone vector database client."""
from pinecone import Pinecone, ServerlessSpec
from app.common.config import settings

# Initialize Pinecone client
pc = Pinecone(api_key=settings.PINECONE_API_KEY)

# Get or create index
def get_pinecone_index():
    """Get Pinecone index for vector operations."""
    index_name = settings.PINECONE_INDEX
    try:
        index = pc.Index(index_name)
        return index
    except Exception as e:
        # Create index if it doesn't exist
        pc.create_index(
            name=index_name,
            dimension=1536,  # OpenAI embedding dimension
            metric="cosine",
            spec=ServerlessSpec(
                cloud="aws",
                region="us-east-1"
            )
        )
        return pc.Index(index_name)


def upsert_vectors(vectors: list, namespace: str = ""):
    """Upsert vectors to Pinecone."""
    index = get_pinecone_index()
    index.upsert(vectors=vectors, namespace=namespace)


def query_vectors(query_vector: list, top_k: int = 10, namespace: str = ""):
    """Query vectors from Pinecone."""
    index = get_pinecone_index()
    results = index.query(
        vector=query_vector,
        top_k=top_k,
        namespace=namespace,
        include_metadata=True
    )
    return results
