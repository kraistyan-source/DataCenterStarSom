import { useMemo, useEffect } from 'react';
import type { VenuePhoto } from '@/lib/db';
import { getMediaUrl } from '@/lib/cloud-db';

/**
 * Returns a playable URL for a media item.
 * Priority: cloud storage path > blob > base64 data
 */
export function useMediaUrl(photo: VenuePhoto | null): string {
  const url = useMemo(() => {
    if (!photo) return '';
    // Cloud storage path
    if ((photo as any).storagePath) {
      return getMediaUrl(photo).url;
    }
    if (photo.mediaType === 'video' && photo.blob) {
      return URL.createObjectURL(photo.blob);
    }
    return photo.data;
  }, [photo]);

  useEffect(() => {
    return () => {
      if (photo?.mediaType === 'video' && photo.blob && url && !(photo as any).storagePath) {
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
      if (p.storagePath) {
        map[p.id] = getMediaUrl(p).url;
      } else if (p.mediaType === 'video' && p.blob) {
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
        if (p.mediaType === 'video' && p.blob && !p.storagePath && urls[p.id]) {
          URL.revokeObjectURL(urls[p.id]);
        }
      }
    };
  }, [urls, photos]);

  return urls;
}

/**
 * Get thumbnail URL for a photo (cloud or local)
 */
export function useThumbnailUrl(photo: VenuePhoto | null): string {
  return useMemo(() => {
    if (!photo) return '';
    if (photo.thumbnailPath) {
      return getMediaUrl(photo).thumbUrl;
    }
    return photo.thumbnail || '';
  }, [photo]);
}
