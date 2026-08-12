export function getFertilizerRecommendation(
  cropType: string,
  soilType?: string | null,
  growthStage?: string | null
): string {
  const crop = cropType.toLowerCase().trim();
  const soil = (soilType ?? 'general').toLowerCase();
  const stage = (growthStage ?? 'general').toLowerCase();

  const cropFertilizers: Record<
    string,
    { basal: string; top_dress: string; micronutrients: string; organic: string }
  > = {
    rice: {
      basal: 'Apply 40-50 kg DAP and 25 kg MOP per acre before planting',
      top_dress: 'Apply 45 kg Urea per acre at tillering and panicle initiation',
      micronutrients: 'Zinc sulfate 25 kg/acre if deficiency observed',
      organic: 'Add 5-10 tonnes FYM during field preparation',
    },
    wheat: {
      basal: 'Apply 50 kg DAP and 30 kg MOP per acre at sowing',
      top_dress:
        'Apply 60 kg Urea per acre — 1st at crown root initiation, 2nd at flowering',
      micronutrients: 'Spray 0.5% zinc sulfate if yellowing observed',
      organic: 'Add 8-10 tonnes compost or 5 tonnes FYM',
    },
    cotton: {
      basal: 'Apply 50 kg DAP and 25 kg MOP per acre',
      top_dress: 'Apply 60 kg Urea per acre in 3 splits: sowing, squaring, flowering',
      micronutrients: 'Boron 0.1% spray at flowering for better boll setting',
      organic: 'Add 10 tonnes FYM or compost before sowing',
    },
    soybean: {
      basal: 'Apply 40 kg DAP and 20 kg MOP per acre at sowing',
      top_dress: 'Apply 20 kg Urea per acre only if needed at early vegetative stage',
      micronutrients: 'Rhizobium seed treatment; molybdenum if nodulation is poor',
      organic: 'Add 5 tonnes FYM; avoid excess nitrogen',
    },
    maize: {
      basal: 'Apply 50 kg DAP and 25 kg MOP per acre at sowing',
      top_dress: 'Apply 50 kg Urea per acre at knee-high stage',
      micronutrients: 'Zinc sulfate 25 kg/acre at sowing in zinc-deficient soils',
      organic: 'Add 5-8 tonnes FYM or compost',
    },
    pulses: {
      basal: 'Apply 20 kg DAP per acre — avoid excess nitrogen for legumes',
      top_dress: 'Minimal nitrogen — rely on Rhizobium fixation',
      micronutrients: 'Rhizobium culture for seed treatment, molybdenum if needed',
      organic: 'Add 5 tonnes FYM, ensure proper nodulation',
    },
    mustard: {
      basal: 'Apply 40 kg DAP and 20 kg MOP per acre',
      top_dress: 'Apply 30 kg Urea per acre at rosette stage',
      micronutrients: 'Sulfur application important for oil content',
      organic: 'Add 5-6 tonnes FYM before sowing',
    },
  };

  const soilAdjustments: Record<string, string> = {
    clay: 'Heavy soils: Reduce fertilizer dose by 10%, apply in splits to avoid leaching',
    sandy: 'Sandy soils: Increase dose by 15%, apply in small frequent splits',
    loamy: 'Loamy soils: Standard doses work well, good water retention',
    black: 'Black cotton soil: Rich in nutrients, may need less phosphorus',
    red: 'Red soils: Often deficient in nitrogen and phosphorus, may need micronutrients',
    saline: 'Saline soils: Use gypsum (500 kg/acre) before fertilizers, leach salts',
  };

  const stagePriority: Record<string, string> = {
    sowing: 'Focus on basal application with phosphorus for root development',
    vegetative: 'Increase nitrogen for leafy growth, maintain moisture',
    flowering: 'Add potassium and micronutrients (boron, zinc) for better setting',
    fruiting: 'Reduce nitrogen, increase potassium for quality produce',
    ripening: 'Stop nitrogen, ensure potassium for grain/fruit filling',
  };

  if (!cropFertilizers[crop]) {
    return (
      '🌾 General Fertilizer Advice:\n\n' +
      '• Basal: 40-50 kg DAP + 25-30 kg MOP per acre\n' +
      '• Top dress: 40-50 kg Urea per acre in 2-3 splits\n' +
      '• Organic: Add 5-10 tonnes FYM or compost\n\n' +
      'For crop-specific advice, tell me your crop name (rice, wheat, cotton, soybean, etc.)'
    );
  }

  const fert = cropFertilizers[crop];
  const lines = [
    `🌾 ${cropType.charAt(0).toUpperCase() + cropType.slice(1)} Fertilizer Schedule:\n`,
    `📍 Basal (At Planting):\n   ${fert.basal}`,
    `\n📈 Top Dressing:\n   ${fert.top_dress}`,
    `\n🔬 Micronutrients:\n   ${fert.micronutrients}`,
    `\n🌱 Organic Matter:\n   ${fert.organic}`,
  ];

  if (soil in soilAdjustments) {
    lines.push(`\n🏜️ Soil (${soil}):\n   ${soilAdjustments[soil]}`);
  }
  if (stage in stagePriority) {
    lines.push(`\n📅 Stage (${stage}):\n   ${stagePriority[stage]}`);
  }

  lines.push(
    '\n⚠️ Always confirm doses with local agriculture university advisory and soil test results.'
  );

  return lines.join('');
}
