"""Content hashing utilities for deduplication."""
import hashlib


def sha256_hash(content: str) -> str:
    """Generate SHA-256 hash of content."""
    return hashlib.sha256(content.encode()).hexdigest()


def sha256_hash_bytes(content: bytes) -> str:
    """Generate SHA-256 hash of bytes."""
    return hashlib.sha256(content).hexdigest()
