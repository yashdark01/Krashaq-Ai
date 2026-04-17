"""
Fertilizer recommendation service for Krashaq.
Provides crop and soil-specific fertilizer advice.
"""

from typing import Dict, Optional


def get_fertilizer_recommendation(
    crop_type: str, 
    soil_type: Optional[str] = None,
    growth_stage: Optional[str] = None
) -> str:
    """
    Generate fertilizer recommendation based on crop, soil, and growth stage.
    
    Args:
        crop_type: Type of crop (rice, wheat, cotton, sugarcane, vegetables, etc.)
        soil_type: Soil type (clay, sandy, loamy, black, red) - optional
        growth_stage: Current growth stage (sowing, vegetative, flowering, fruiting) - optional
    
    Returns:
        Formatted fertilizer recommendation message
    """
    crop = crop_type.lower()
    soil = (soil_type or "general").lower()
    stage = (growth_stage or "general").lower()
    
    # Base fertilizer data by crop
    crop_fertilizers = {
        "rice": {
            "basal": "Apply 40-50 kg DAP and 25 kg MOP per acre before planting",
            "top_dress": "Apply 45 kg Urea per acre at tillering and panicle initiation",
            "micronutrients": "Zinc sulfate 25 kg/acre if deficiency observed",
            "organic": "Add 5-10 tonnes FYM during field preparation"
        },
        "wheat": {
            "basal": "Apply 50 kg DAP and 30 kg MOP per acre at sowing",
            "top_dress": "Apply 60 kg Urea per acre - 1st at crown root initiation, 2nd at flowering",
            "micronutrients": "Spray 0.5% zinc sulfate if yellowing observed",
            "organic": "Add 8-10 tonnes compost or 5 tonnes FYM"
        },
        "cotton": {
            "basal": "Apply 50 kg DAP and 25 kg MOP per acre",
            "top_dress": "Apply 60 kg Urea per acre in 3 splits: sowing, squaring, flowering",
            "micronutrients": "Boron 0.1% spray at flowering for better boll setting",
            "organic": "Add 10 tonnes FYM or compost before sowing"
        },
        "sugarcane": {
            "basal": "Apply 60 kg DAP, 40 kg MOP, and 40 kg Urea per acre at planting",
            "top_dress": "Apply 80 kg Urea per acre in 3 splits during growing season",
            "micronutrients": "Iron and zinc sulfate spray if chlorosis observed",
            "organic": "Add 15-20 tonnes press mud or 10 tonnes FYM"
        },
        "vegetables": {
            "basal": "Apply 40 kg DAP and 30 kg MOP per acre",
            "top_dress": "Apply 40 kg Urea per acre in 2-3 splits",
            "micronutrients": "Calcium nitrate for fruit vegetables, boron for flowering",
            "organic": "Add 10-15 tonnes well-decomposed FYM"
        },
        "maize": {
            "basal": "Apply 50 kg DAP and 25 kg MOP per acre at sowing",
            "top_dress": "Apply 50 kg Urea per acre at knee-high stage",
            "micronutrients": "Zinc sulfate 25 kg/acre at sowing in zinc-deficient soils",
            "organic": "Add 5-8 tonnes FYM or compost"
        },
        "pulses": {
            "basal": "Apply 20 kg DAP per acre - avoid excess nitrogen for legumes",
            "top_dress": "Minimal nitrogen - rely on Rhizobium fixation",
            "micronutrients": "Rhizobium culture for seed treatment, molybdenum if needed",
            "organic": "Add 5 tonnes FYM, ensure proper nodulation"
        },
        "mustard": {
            "basal": "Apply 40 kg DAP and 20 kg MOP per acre",
            "top_dress": "Apply 30 kg Urea per acre at rosette stage",
            "micronutrients": "Sulfur application important for oil content",
            "organic": "Add 5-6 tonnes FYM before sowing"
        }
    }
    
    # Soil-specific adjustments
    soil_adjustments = {
        "clay": "Heavy soils: Reduce fertilizer dose by 10%, apply in splits to avoid leaching",
        "sandy": "Sandy soils: Increase dose by 15%, apply in small frequent splits",
        "loamy": "Loamy soils: Standard doses work well, good water retention",
        "black": "Black cotton soil: Rich in nutrients, may need less phosphorus",
        "red": "Red soils: Often deficient in nitrogen and phosphorus, may need micronutrients",
        "saline": "Saline soils: Use gypsum (500 kg/acre) before fertilizers, leach salts"
    }
    
    # Growth stage priorities
    stage_priority = {
        "sowing": "Focus on basal application with phosphorus for root development",
        "vegetative": "Increase nitrogen for leafy growth, maintain moisture",
        "flowering": "Add potassium and micronutrients (boron, zinc) for better setting",
        "fruiting": "Reduce nitrogen, increase potassium for quality produce",
        "ripening": "Stop nitrogen, ensure potassium for grain/fruit filling"
    }
    
    # Build response
    if crop not in crop_fertilizers:
        return (
            "🌾 General Fertilizer Advice:\n\n"
            "• Basal: 40-50 kg DAP + 25-30 kg MOP per acre\n"
            "• Top dress: 40-50 kg Urea per acre in 2-3 splits\n"
            "• Organic: Add 5-10 tonnes FYM or compost\n\n"
            "For crop-specific advice, tell me your crop name (rice, wheat, cotton, etc.)"
        )
    
    fert = crop_fertilizers[crop]
    
    lines = [
        f"🌾 {crop_type.title()} Fertilizer Schedule:\n",
        f"📍 Basal (At Planting):\n   {fert['basal']}",
        f"\n📈 Top Dressing:\n   {fert['top_dress']}",
        f"\n🔬 Micronutrients:\n   {fert['micronutrients']}",
        f"\n🌱 Organic Matter:\n   {fert['organic']}"
    ]
    
    # Add soil-specific advice if provided
    if soil in soil_adjustments:
        lines.append(f"\n🧪 Soil Note ({soil_type.title()}):\n   {soil_adjustments[soil]}")
    
    # Add stage-specific advice if provided
    if stage in stage_priority and stage != "general":
        lines.append(f"\n📅 Current Stage ({growth_stage.title()}):\n   {stage_priority[stage]}")
    
    lines.append("\n⚠️ General Tips:\n"
                "   • Always apply fertilizers when soil has adequate moisture\n"
                "   • Keep 7-10 days gap between fertilizer and pesticide application\n"
                "   • Do soil testing every 2-3 years for precision farming")
    
    return "\n".join(lines)


def format_fertilizer_for_chat(crop: str, soil: Optional[str] = None, stage: Optional[str] = None) -> str:
    """Format fertilizer recommendation for chat response."""
    return get_fertilizer_recommendation(crop, soil, stage)
