"""
Metrics collection service for Krashaq LLM agent.
Tracks response quality, tool usage, and performance metrics.
"""

import time
from typing import Dict, Any, Optional
from datetime import datetime
from app.common.config import get_settings


class MetricsService:
    """Service for collecting and tracking LLM agent metrics."""
    
    def __init__(self):
        """Initialize metrics service."""
        self.metrics = {
            "total_requests": 0,
            "successful_requests": 0,
            "failed_requests": 0,
            "total_response_time": 0,
            "tool_usage": {},
            "reflection_count": 0,
            "cache_hits": 0,
            "cache_misses": 0,
            "llm_provider_usage": {},
            "language_usage": {},
            "error_types": {},
            # Multi-agent specific metrics
            "agent_type_usage": {
                "multi-agent": 0,
                "single-agent": 0
            },
            "specialist_agent_usage": {
                "weather": 0,
                "crop": 0,
                "irrigation": 0,
                "fertilizer": 0
            },
            "agent_invocation_count": {},
            "synthesis_count": 0
        }
    
    def record_request(self, session_id: str, start_time: float, end_time: float, 
                      success: bool, tools_used: list, reflection_count: int,
                      llm_provider: str, language: str, error: Optional[str] = None,
                      agent_type: str = "single-agent"):
        """
        Record metrics for a single request.
        
        Args:
            session_id: Session identifier
            start_time: Request start timestamp
            end_time: Request end timestamp
            success: Whether request was successful
            tools_used: List of tools used
            reflection_count: Number of reflection iterations
            llm_provider: LLM provider used
            language: Language of the response
            error: Error message if failed
            agent_type: Type of agent used (multi-agent or single-agent)
        """
        response_time = end_time - start_time
        
        # Basic metrics
        self.metrics["total_requests"] += 1
        if success:
            self.metrics["successful_requests"] += 1
        else:
            self.metrics["failed_requests"] += 1
        
        self.metrics["total_response_time"] += response_time
        
        # Agent type tracking
        if agent_type in self.metrics["agent_type_usage"]:
            self.metrics["agent_type_usage"][agent_type] += 1
        
        # Tool usage
        for tool in tools_used:
            self.metrics["tool_usage"][tool] = self.metrics["tool_usage"].get(tool, 0) + 1
        
        # Reflection count
        self.metrics["reflection_count"] += reflection_count
        
        # LLM provider usage
        self.metrics["llm_provider_usage"][llm_provider] = \
            self.metrics["llm_provider_usage"].get(llm_provider, 0) + 1
        
        # Language usage
        self.metrics["language_usage"][language] = self.metrics["language_usage"].get(language, 0) + 1
        
        # Error tracking
        if error:
            self.metrics["error_types"][error] = self.metrics["error_types"].get(error, 0) + 1
    
    def record_cache_hit(self):
        """Record a cache hit."""
        self.metrics["cache_hits"] += 1
    
    def record_cache_miss(self):
        """Record a cache miss."""
        self.metrics["cache_misses"] += 1
    
    def record_specialist_agent_invocation(self, agent_name: str):
        """
        Record invocation of a specialist agent.
        
        Args:
            agent_name: Name of the specialist agent (weather, crop, irrigation, fertilizer)
        """
        if agent_name in self.metrics["specialist_agent_usage"]:
            self.metrics["specialist_agent_usage"][agent_name] += 1
        
        # Track total invocations per agent
        key = f"{agent_name}_invocations"
        self.metrics["agent_invocation_count"][key] = \
            self.metrics["agent_invocation_count"].get(key, 0) + 1
    
    def record_synthesis(self):
        """Record a synthesis operation."""
        self.metrics["synthesis_count"] += 1
    
    def get_metrics(self) -> Dict[str, Any]:
        """
        Get current metrics.
        
        Returns:
            Dictionary of current metrics
        """
        avg_response_time = 0
        if self.metrics["successful_requests"] > 0:
            avg_response_time = self.metrics["total_response_time"] / self.metrics["successful_requests"]
        
        cache_hit_rate = 0
        total_cache_ops = self.metrics["cache_hits"] + self.metrics["cache_misses"]
        if total_cache_ops > 0:
            cache_hit_rate = self.metrics["cache_hits"] / total_cache_ops
        
        success_rate = 0
        if self.metrics["total_requests"] > 0:
            success_rate = self.metrics["successful_requests"] / self.metrics["total_requests"]
        
        return {
            "total_requests": self.metrics["total_requests"],
            "successful_requests": self.metrics["successful_requests"],
            "failed_requests": self.metrics["failed_requests"],
            "success_rate": round(success_rate * 100, 2),
            "avg_response_time": round(avg_response_time, 3),
            "tool_usage": self.metrics["tool_usage"],
            "total_reflections": self.metrics["reflection_count"],
            "cache_hit_rate": round(cache_hit_rate * 100, 2),
            "cache_hits": self.metrics["cache_hits"],
            "cache_misses": self.metrics["cache_misses"],
            "llm_provider_usage": self.metrics["llm_provider_usage"],
            "language_usage": self.metrics["language_usage"],
            "error_types": self.metrics["error_types"],
            # Multi-agent metrics
            "agent_type_usage": self.metrics["agent_type_usage"],
            "specialist_agent_usage": self.metrics["specialist_agent_usage"],
            "agent_invocation_count": self.metrics["agent_invocation_count"],
            "synthesis_count": self.metrics["synthesis_count"]
        }
    
    def reset_metrics(self):
        """Reset all metrics to zero."""
        self.metrics = {
            "total_requests": 0,
            "successful_requests": 0,
            "failed_requests": 0,
            "total_response_time": 0,
            "tool_usage": {},
            "reflection_count": 0,
            "cache_hits": 0,
            "cache_misses": 0,
            "llm_provider_usage": {},
            "language_usage": {},
            "error_types": {},
            # Multi-agent specific metrics
            "agent_type_usage": {
                "multi-agent": 0,
                "single-agent": 0
            },
            "specialist_agent_usage": {
                "weather": 0,
                "crop": 0,
                "irrigation": 0,
                "fertilizer": 0
            },
            "agent_invocation_count": {},
            "synthesis_count": 0
        }


# Global metrics instance
_metrics_service = None

def get_metrics_service() -> MetricsService:
    """Get or create metrics service instance."""
    global _metrics_service
    if _metrics_service is None:
        _metrics_service = MetricsService()
    return _metrics_service


def calculate_response_quality(response: str, tools_used: list, 
                               reflection_count: int) -> Dict[str, Any]:
    """
    Calculate quality score for a response.
    
    Args:
        response: The response text
        tools_used: List of tools used
        reflection_count: Number of reflections
    
    Returns:
        Dictionary with quality metrics
    """
    quality_score = 100
    
    # Penalize very short responses
    if len(response) < 50:
        quality_score -= 30
    elif len(response) < 100:
        quality_score -= 10
    
    # Penalize error messages
    if "Unable to fetch" in response or "Please try again" in response:
        quality_score -= 50
    
    # Penalize generic responses
    if "I can help you with:" in response and len(tools_used) == 0:
        quality_score -= 20
    
    # Bonus for using tools
    if len(tools_used) > 0:
        quality_score += 10
    
    # Penalty for high reflection count (indicates poor initial response)
    if reflection_count > 0:
        quality_score -= reflection_count * 5
    
    # Ensure score is within bounds
    quality_score = max(0, min(100, quality_score))
    
    return {
        "quality_score": quality_score,
        "response_length": len(response),
        "tools_used_count": len(tools_used),
        "reflection_count": reflection_count
    }
