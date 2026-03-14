export interface FilterState {
  city: string;
  venueType: string;
  eventType: string;
  search: string;
  lastNEvents: number | null; // null = show all, 5 = last 5 events
}

export const defaultFilters: FilterState = {
  city: '',
  venueType: '',
  eventType: '',
  search: '',
  lastNEvents: null,
};

// Pinned photos helpers (stored in localStorage)
const PINNED_KEY = 'pinned-photos';

export interface PinnedPhoto {
  photoId: string;
  venueId: string;
}

export function getPinnedPhotos(): PinnedPhoto[] {
  try {
    return JSON.parse(localStorage.getItem(PINNED_KEY) || '[]');
  } catch { return []; }
}

export function setPinnedPhotos(pinned: PinnedPhoto[]) {
  localStorage.setItem(PINNED_KEY, JSON.stringify(pinned));
}

export function togglePinPhoto(photoId: string, venueId: string): PinnedPhoto[] {
  const current = getPinnedPhotos();
  const exists = current.find(p => p.photoId === photoId);
  let updated: PinnedPhoto[];
  if (exists) {
    updated = current.filter(p => p.photoId !== photoId);
  } else {
    // Max 3 global pinned
    if (current.length >= 3) return current;
    updated = [...current, { photoId, venueId }];
  }
  setPinnedPhotos(updated);
  return updated;
}
