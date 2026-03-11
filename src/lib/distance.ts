export interface HomeBase {
  lat: number;
  lng: number;
  name: string;
}

const STORAGE_KEY = 'event-portfolio-homebase';
const DISTANCE_CACHE_KEY = 'event-portfolio-distances';

export function getHomeBase(): HomeBase | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setHomeBase(hb: HomeBase): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(hb));
  // Clear distance cache when home base changes
  localStorage.removeItem(DISTANCE_CACHE_KEY);
}

export function removeHomeBase(): void {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(DISTANCE_CACHE_KEY);
}

/** Haversine distance in km (fallback) */
export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

// --- Road distance via OSRM ---

interface DistanceCache {
  [venueId: string]: number; // km by road
}

function getDistanceCache(): DistanceCache {
  try {
    const raw = localStorage.getItem(DISTANCE_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveDistanceCache(cache: DistanceCache): void {
  localStorage.setItem(DISTANCE_CACHE_KEY, JSON.stringify(cache));
}

export function getCachedRoadDistance(venueId: string): number | null {
  const cache = getDistanceCache();
  return cache[venueId] ?? null;
}

/**
 * Fetch road distance from OSRM for a single venue.
 * Returns distance in km or null on failure.
 */
export async function fetchRoadDistance(
  fromLat: number, fromLng: number,
  toLat: number, toLng: number,
  venueId: string
): Promise<number | null> {
  // Check cache first
  const cached = getCachedRoadDistance(venueId);
  if (cached !== null) return cached;

  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=false`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.code !== 'Ok' || !data.routes?.[0]) return null;
    
    const km = data.routes[0].distance / 1000;
    
    // Cache it
    const cache = getDistanceCache();
    cache[venueId] = Math.round(km * 10) / 10;
    saveDistanceCache(cache);
    
    return km;
  } catch {
    return null;
  }
}

/**
 * Batch fetch road distances using OSRM table API.
 * More efficient than individual requests.
 * Returns map of venueId -> km
 */
export async function fetchRoadDistancesBatch(
  fromLat: number, fromLng: number,
  venues: { id: string; lat: number; lng: number }[]
): Promise<Record<string, number>> {
  const cache = getDistanceCache();
  const results: Record<string, number> = {};
  const uncached: { id: string; lat: number; lng: number }[] = [];

  // Use cached values first
  for (const v of venues) {
    if (cache[v.id] !== undefined) {
      results[v.id] = cache[v.id];
    } else {
      uncached.push(v);
    }
  }

  if (uncached.length === 0) return results;

  // OSRM table API: source is index 0, all others are destinations
  // Process in batches of 50 to avoid URL length limits
  const BATCH_SIZE = 50;
  for (let i = 0; i < uncached.length; i += BATCH_SIZE) {
    const batch = uncached.slice(i, i + BATCH_SIZE);
    const coords = [`${fromLng},${fromLat}`, ...batch.map(v => `${v.lng},${v.lat}`)].join(';');
    const destinations = batch.map((_, idx) => idx + 1).join(';');

    try {
      const url = `https://router.project-osrm.org/table/v1/driving/${coords}?sources=0&destinations=${destinations}&annotations=distance`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      if (data.code !== 'Ok' || !data.distances?.[0]) continue;

      const distances: number[] = data.distances[0];
      for (let j = 0; j < batch.length; j++) {
        if (distances[j] !== null && distances[j] !== undefined) {
          const km = Math.round((distances[j] / 1000) * 10) / 10;
          results[batch[j].id] = km;
          cache[batch[j].id] = km;
        }
      }
    } catch {
      // Silently fail, will show straight-line as fallback
    }
  }

  saveDistanceCache(cache);
  return results;
}
