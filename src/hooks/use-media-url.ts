import { useMemo, useEffect } from 'react';
import type { VenuePhoto } from '@/lib/db';

/**
 * Returns a playable URL for a media item.
 * - Photos: returns the base64 data URL
 * - Videos with blob: creates an object URL (revoked on unmount)
 * - Videos with data (legacy base64): returns the data URL
 */
export function useMediaUrl(photo: VenuePhoto | null): string {
  const url = useMemo(() => {
    if (!photo) return '';
    if (photo.mediaType === 'video' && photo.blob) {
      return URL.createObjectURL(photo.blob);
    }
    return photo.data;
  }, [photo]);

  useEffect(() => {
    return () => {
      if (photo?.mediaType === 'video' && photo.blob && url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [url, photo]);

  return url;
}

/**
 * Batch version: returns map of photo.id -> URL
 */
export function useMediaUrls(photos: VenuePhoto[]): Record<string, string> {
  const urls = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of photos) {
      if (p.mediaType === 'video' && p.blob) {
        map[p.id] = URL.createObjectURL(p.blob);
      } else {
        map[p.id] = p.data;
      }
    }
    return map;
  }, [photos]);

  useEffect(() => {
    return () => {
      for (const p of photos) {
        if (p.mediaType === 'video' && p.blob && urls[p.id]) {
          URL.revokeObjectURL(urls[p.id]);
        }
      }
    };
  }, [urls, photos]);

  return urls;
}
