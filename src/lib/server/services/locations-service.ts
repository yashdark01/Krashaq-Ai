import locationsData from '@/data/locations.json';

interface Locality {
  name: string;
  type?: string;
  pincode?: string;
}

interface Tehsil {
  id: string;
  name: string;
  headquarters?: string;
  primary_pincode?: string;
  localities?: Locality[];
}

interface District {
  id: string;
  name: string;
  state: string;
  district_code?: string;
  headquarters?: string;
  total_tehsils?: number;
  tehsils?: Tehsil[];
}

function getDistricts(): District[] {
  return (locationsData as { districts: District[] }).districts ?? [];
}

export function getStates() {
  const states = new Set<string>();
  for (const district of getDistricts()) {
    if (district.state) states.add(district.state);
  }
  return { states: [...states].sort() };
}

export function getDistrictsByState(state: string) {
  const districts = getDistricts()
    .filter((d) => d.state === state)
    .map((d) => ({
      id: d.id,
      name: d.name,
      district_code: d.district_code,
      headquarters: d.headquarters,
      total_tehsils: d.total_tehsils ?? d.tehsils?.length ?? 0,
    }));
  return { districts };
}

export function getTehsilsByDistrict(state: string, district: string) {
  const tehsils: Array<{
    id: string;
    name: string;
    headquarters?: string;
    primary_pincode?: string;
    total_localities: number;
  }> = [];

  for (const dist of getDistricts()) {
    if (dist.state === state && dist.name === district) {
      for (const tehsil of dist.tehsils ?? []) {
        tehsils.push({
          id: tehsil.id,
          name: tehsil.name,
          headquarters: tehsil.headquarters,
          primary_pincode: tehsil.primary_pincode,
          total_localities: tehsil.localities?.length ?? 0,
        });
      }
      break;
    }
  }

  return { tehsils };
}

export function getLocalitiesByTehsil(state: string, district: string, tehsil: string) {
  const localities: Locality[] = [];

  for (const dist of getDistricts()) {
    if (dist.state === state && dist.name === district) {
      for (const tehsilData of dist.tehsils ?? []) {
        if (tehsilData.name === tehsil) {
          for (const locality of tehsilData.localities ?? []) {
            localities.push({
              name: locality.name,
              type: locality.type,
              pincode: locality.pincode,
            });
          }
          break;
        }
      }
      break;
    }
  }

  return { localities };
}
