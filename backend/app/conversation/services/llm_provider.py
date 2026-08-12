"""
Multi-provider LLM factory for Krashaq.
Supports Ollama (local), Google Gemini, OpenAI, Anthropic Claude, and Grok.
"""

from typing import Optional, Dict, Any
from app.common.config import get_settings

# Lazy imports to avoid loading all providers unnecessarily
def _import_ollama():
    from langchain_ollama import ChatOllama
    return ChatOllama

def _import_gemini():
    from langchain_google_genai import ChatGoogleGenerativeAI
    return ChatGoogleGenerativeAI

def _import_openai():
    from langchain_openai import ChatOpenAI
    return ChatOpenAI

def _import_anthropic():
    from langchain_anthropic import ChatAnthropic
    return ChatAnthropic

def _import_groq():
    from langchain_openai import ChatOpenAI
    return ChatOpenAI


# Provider configurations with default models
PROVIDER_CONFIGS: Dict[str, Dict[str, Any]] = {
    "ollama": {
        "class_fn": _import_ollama,
        "default_model": "llama3.1:8b",
        "required_key": None,
    },
    "gemini": {
        "class_fn": _import_gemini,
        "default_model": "gemini-1.5-pro",
        "required_key": "google_api_key",
    },
    "openai": {
        "class_fn": _import_openai,
        "default_model": "gpt-4o-mini",
        "required_key": "openai_api_key",
    },
    "claude": {
        "class_fn": _import_anthropic,
        "default_model": "claude-3-haiku-20240307",
        "required_key": "anthropic_api_key",
    },
    "groq": {
        "class_fn": _import_groq,
        "default_model": "llama-3.3-70b-versatile",
        "required_key": "groq_api_key",
    },
    "xai": {
        "class_fn": _import_openai,
        "default_model": "xai-reasoner",
        "required_key": "xai_api_key",
    },
}

DEFAULT_CHAIN = ["groq", "gemini", "xai", "ollama"]


def get_llm(provider: Optional[str] = None, temperature: float = 0.7):
    """
    Factory function to get LLM instance based on provider.
    
    Args:
        provider: Provider name (ollama, gemini, openai, claude, groq). 
                  If None, uses LLM_PROVIDER from settings.
        temperature: Temperature for response generation (0.0-1.0)
    
    Returns:
        Configured LLM instance
    
    Raises:
        ValueError: If provider is not supported
        RuntimeError: If required API key is missing for cloud providers
    """
    settings = get_settings()
    provider = (provider or settings.llm_provider).lower()
    
    if provider not in PROVIDER_CONFIGS:
        raise ValueError(f"Unsupported provider: {provider}. "
                        f"Choose from: {list(PROVIDER_CONFIGS.keys())}")
    
    config = PROVIDER_CONFIGS[provider]
    
    # Check if cloud provider has API key
    if config["required_key"]:
        api_key = getattr(settings, config["required_key"], "")
        if not api_key:
            raise RuntimeError(
                f"Provider '{provider}' requires API key. "
                f"Set {config['required_key'].upper()} in environment."
            )
    
    # Get the LLM class
    if config["class_fn"] is None:
        raise RuntimeError(f"Provider '{provider}' is not yet implemented in LangChain.")
    
    LLMClass = config["class_fn"]()
    
    # Configure provider-specific parameters
    if provider == "ollama":
        return LLMClass(
            model=settings.ollama_model or config["default_model"],
            base_url=settings.ollama_base_url,
            temperature=temperature,
        )
    elif provider == "gemini":
        return LLMClass(
            model=settings.gemini_model or config["default_model"],
            google_api_key=settings.google_api_key,
            temperature=temperature,
        )
    elif provider == "openai":
        return LLMClass(
            model=settings.openai_model or config["default_model"],
            api_key=settings.openai_api_key,
            temperature=temperature,
        )
    elif provider == "claude":
        return LLMClass(
            model=settings.claude_model or config["default_model"],
            api_key=settings.anthropic_api_key,
            temperature=temperature,
        )
    elif provider == "groq":
        return LLMClass(
            model=settings.groq_model or config["default_model"],
            api_key=settings.groq_api_key,
            base_url="https://api.groq.com/openai/v1",
            temperature=temperature,
        )
    elif provider == "xai":
        return LLMClass(
            model=settings.xai_model or config["default_model"],
            api_key=settings.xai_api_key,
            base_url="https://api.x.ai/v1",
            temperature=temperature,
        )
    
    raise RuntimeError(f"Failed to initialize provider: {provider}")


def get_available_providers() -> list:
    """Get list of available providers that are properly configured."""
    settings = get_settings()
    available = []
    
    for provider, config in PROVIDER_CONFIGS.items():
        if config["required_key"] is None:
            # Local providers are always available
            available.append(provider)
        else:
            # Check if API key is set
            api_key = getattr(settings, config["required_key"], "")
            if api_key:
                available.append(provider)
    
    return available


def get_llm_with_fallback(primary_provider: Optional[str] = None, temperature: float = 0.7):
    """
    Get LLM with automatic fallback to Ollama if primary provider fails.
    
    Args:
        primary_provider: Preferred provider name
        temperature: Temperature for response generation
    
    Returns:
        Configured LLM instance (may be fallback)
    """
    settings = get_settings()
    primary = primary_provider or settings.llm_provider
    
    try:
        return get_llm(primary, temperature)
    except (ValueError, RuntimeError) as e:
        # Try fallback to Ollama
        if primary != "ollama":
            try:
                return get_llm("ollama", temperature)
            except Exception:
                pass
        raise e


def resolve_llm_with_chain(chain=None, temperature=0.7, init_fn=None):
    """
    Resolve LLM using deterministic fallback chain.
    
    Args:
        chain: List of provider names in fallback order. If None, uses DEFAULT_CHAIN.
        temperature: Temperature for response generation
        init_fn: Optional custom initialization function. If None, uses get_llm.
    
    Returns:
        Tuple of (llm_instance, provider_used, errors_dict)
    
    Raises:
        RuntimeError: If all providers in the chain fail
    """
    init = init_fn or get_llm
    ordered = chain or DEFAULT_CHAIN
    errors = {}
    for provider in ordered:
        try:
            llm = init(provider, temperature=temperature)
            return llm, provider, errors
        except Exception as exc:
            errors[provider] = str(exc)
            continue
    raise RuntimeError(f"All providers failed: {errors}")
