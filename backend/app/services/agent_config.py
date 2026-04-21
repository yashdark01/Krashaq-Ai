"""
Agent configuration for Krashaq multi-agent system.
Defines model settings, tools, and behavior for each agent.
"""

from typing import Dict, Any, List, Optional

# Agent configuration
AGENT_CONFIG: Dict[str, Dict[str, Any]] = {
    "orchestrator": {
        "model": "ollama/llama3.1:8b",
        "temperature": 0.3,
        "max_tokens": 2000,
        "enable_reflection": True,
        "max_reflections": 2,
        "tools": [],
        "cache_ttl": 0,  # No caching for orchestrator
        "enabled": True
    },
    "weather": {
        "model": "ollama/llama3.1:8b",
        "temperature": 0.2,
        "max_tokens": 1000,
        "enable_reflection": False,
        "tools": ["get_current_weather", "get_forecast", "get_alerts"],
        "cache_ttl": 300,  # 5 minutes
        "enabled": True
    },
    "crop": {
        "model": "ollama/llama3.1:8b",
        "temperature": 0.4,
        "max_tokens": 1500,
        "enable_reflection": False,
        "tools": ["get_crop_info", "identify_disease", "get_pest_management"],
        "cache_ttl": 1800,  # 30 minutes
        "enabled": True
    },
    "irrigation": {
        "model": "ollama/llama3.1:8b",
        "temperature": 0.3,
        "max_tokens": 1200,
        "enable_reflection": False,
        "tools": ["calculate_water_requirement", "get_irrigation_schedule"],
        "cache_ttl": 600,  # 10 minutes
        "enabled": True
    },
    "fertilizer": {
        "model": "ollama/llama3.1:8b",
        "temperature": 0.3,
        "max_tokens": 1200,
        "enable_reflection": False,
        "tools": ["recommend_fertilizer", "analyze_soil_report"],
        "cache_ttl": 3600,  # 1 hour
        "enabled": True
    },
    "synthesis": {
        "model": "ollama/llama3.1:8b",
        "temperature": 0.5,
        "max_tokens": 2000,
        "enable_reflection": False,
        "tools": [],
        "cache_ttl": 0,  # No caching for synthesis
        "enabled": True
    }
}


def get_agent_config(agent_name: str) -> Dict[str, Any]:
    """
    Get configuration for a specific agent.
    
    Args:
        agent_name: Name of the agent
    
    Returns:
        Agent configuration dictionary
    """
    return AGENT_CONFIG.get(agent_name, {})


def is_agent_enabled(agent_name: str) -> bool:
    """
    Check if an agent is enabled.
    
    Args:
        agent_name: Name of the agent
    
    Returns:
        True if agent is enabled
    """
    config = get_agent_config(agent_name)
    return config.get("enabled", True)


def set_agent_enabled(agent_name: str, enabled: bool):
    """
    Enable or disable an agent.
    
    Args:
        agent_name: Name of the agent
        enabled: Whether to enable the agent
    """
    if agent_name in AGENT_CONFIG:
        AGENT_CONFIG[agent_name]["enabled"] = enabled


def get_enabled_agents() -> List[str]:
    """
    Get list of enabled agents.
    
    Returns:
        List of enabled agent names
    """
    return [name for name, config in AGENT_CONFIG.items() if config.get("enabled", True)]


def get_agent_model(agent_name: str) -> Optional[str]:
    """
    Get the model for a specific agent.
    
    Args:
        agent_name: Name of the agent
    
    Returns:
        Model name or None
    """
    config = get_agent_config(agent_name)
    return config.get("model")


def set_agent_model(agent_name: str, model: str):
    """
    Set the model for a specific agent.
    
    Args:
        agent_name: Name of the agent
        model: Model name to use
    """
    if agent_name in AGENT_CONFIG:
        AGENT_CONFIG[agent_name]["model"] = model
