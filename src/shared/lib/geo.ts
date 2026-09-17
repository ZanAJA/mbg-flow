export type LatLng = { lat: number; lng: number };

function isValidLatLng(lat: number, lng: number): lat is number {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

/**
 * Extract coordinates from a Google Maps URL, share link fragment, or plain "lat, lng".
 * Short links (maps.app.goo.gl) must be opened first and the full URL copied.
 */
export function parseMapsLocation(input: string): LatLng | null {
  const text = input.trim();
  if (!text) return null;

  const plain = text.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (plain) {
    const lat = Number(plain[1]);
    const lng = Number(plain[2]);
    if (isValidLatLng(lat, lng)) return { lat, lng };
  }

  const candidates: Array<[number, number]> = [];

  const atMatch = text.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (atMatch) candidates.push([Number(atMatch[1]), Number(atMatch[2])]);

  const qMatch = text.match(/[?&](?:q|query|ll)=(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/i);
  if (qMatch) candidates.push([Number(qMatch[1]), Number(qMatch[2])]);

  const data3d4d = text.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  if (data3d4d) candidates.push([Number(data3d4d[1]), Number(data3d4d[2])]);

  const placeMatch = text.match(/\/place\/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (placeMatch) candidates.push([Number(placeMatch[1]), Number(placeMatch[2])]);

  for (const [lat, lng] of candidates) {
    if (isValidLatLng(lat, lng)) return { lat, lng };
  }
  return null;
}

export function mapsUrlFromCoords(lat: number, lng: number) {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

/** Great-circle distance in kilometers (WGS84 sphere). */
export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)) * 10) / 10;
}

export function distanceOrFallback(input: {
  from?: { lat: number | null | undefined; lng: number | null | undefined } | null;
  to?: { lat: number | null | undefined; lng: number | null | undefined; distanceKm?: number } | null;
}): number {
  const from = input.from;
  const to = input.to;
  if (
    from &&
    to &&
    from.lat != null &&
    from.lng != null &&
    to.lat != null &&
    to.lng != null
  ) {
    return haversineKm(
      { lat: from.lat, lng: from.lng },
      { lat: to.lat, lng: to.lng },
    );
  }
  return to?.distanceKm ?? 0;
}
