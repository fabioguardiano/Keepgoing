const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

export interface GeocodeResult {
  lat: number;
  lng: number;
  formattedAddress: string;
}

/**
 * Busca coordenadas para um endereço utilizando a API do Mapbox.
 * O Mapbox Geocoding permite uma precisão muito superior ao Nominatim.
 */
export async function geocodeAddress(
  street: string,
  number: string,
  city: string,
  state: string,
  zipCode: string
): Promise<GeocodeResult | null> {
  if (!street && !zipCode) return null;

  const components = [street, number, city, state, zipCode, 'Brasil'].filter(c => c && c.toString().trim() !== '');
  const query = components.join(', ');
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&limit=1&language=pt&country=BR`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Falha na busca do Mapbox');
    
    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      const [lng, lat] = data.features[0].center;
      return {
        lat,
        lng,
        formattedAddress: data.features[0].place_name
      };
    }
    
    return null;
  } catch (error) {
    console.error('[MapboxGeocodingError]', error);
    return null;
  }
}

/**
 * Decodifica uma string de polyline6 do Valhalla/OSRM em coordenadas [lat, lng].
 */
export function decodePolyline6(polyline: string): [number, number][] {
  let index = 0,
    lat = 0,
    lng = 0,
    coordinates = [],
    shift = 0,
    result = 0,
    byte = null,
    latitude_change,
    longitude_change,
    factor = Math.pow(10, 6);

  while (index < polyline.length) {
    shift = 0;
    result = 0;
    do {
      byte = polyline.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    latitude_change = ((result & 1) ? ~(result >> 1) : (result >> 1));

    shift = 0;
    result = 0;
    do {
      byte = polyline.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    longitude_change = ((result & 1) ? ~(result >> 1) : (result >> 1));

    lat += latitude_change;
    lng += longitude_change;

    coordinates.push([lat / factor, lng / factor]);
  }

  return coordinates as [number, number][];
}

/**
 * Busca a rota real por ruas entre múltiplos pontos utilizando a API de Direções do Mapbox.
 * @param waypoints Array de coordenadas [[lat, lng], ...]
 * @returns Array de coordenadas [[lng, lat], ...] formato esperado pelo Mapbox GeoJSON Source
 */
export async function fetchDirections(waypoints: [number, number][]): Promise<[number, number][]> {
  if (waypoints.length < 2) return [];

  // Mapbox espera longitude,latitude
  const coordsString = waypoints.map(([lat, lng]) => `${lng},${lat}`).join(';');
  
  // Usamos geometrias em polyline6 para alta precisão e compatibilidade com o decoder existente
  // 'driving' garante que a rota siga o caminho de veículos
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordsString}?geometries=polyline6&overview=full&access_token=${MAPBOX_TOKEN}`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Falha na busca de direções do Mapbox');
    
    const data = await response.json();
    
    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const decodedCoords = decodePolyline6(route.geometry);
      // O Mapbox GeoJSON Source espera [longitude, latitude]
      return decodedCoords.map(([lat, lng]) => [lng, lat]);
    }
    
    return [];
  } catch (error) {
    console.error('[MapboxDirectionsError]', error);
    return [];
  }
}
