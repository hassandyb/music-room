import { randomBytes } from "crypto";

export function generateToken(): string {
    return randomBytes(32).toString('hex');
}

export function calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
}

export function isWithinRadius(
    userLat: number,
    userLon: number,
    eventLat: number,
    eventLon: number,
    radiusInMeters: number
): boolean {
    const distance = calculateDistance(userLat, userLon, eventLat, eventLon);
    return distance <= radiusInMeters;
}

/**
 * Parses an HTTP `Range: bytes=start-end` header into a concrete byte range.
 * Returns undefined for a missing/malformed/out-of-bounds header, meaning
 * "serve the whole file" — callers should fall back to that.
 */
export function parseRangeHeader(
    rangeHeader: string | undefined,
    totalSize: number,
): { start: number; end: number } | undefined {
    if (!rangeHeader || !rangeHeader.startsWith('bytes=')) return undefined;

    const [startStr, endStr] = rangeHeader.replace('bytes=', '').split('-');
    const start = startStr ? parseInt(startStr, 10) : 0;
    const end = endStr ? parseInt(endStr, 10) : totalSize - 1;

    if (
        Number.isNaN(start) ||
        Number.isNaN(end) ||
        start < 0 ||
        end < start ||
        end >= totalSize
    ) {
        return undefined;
    }

    return { start, end };
}