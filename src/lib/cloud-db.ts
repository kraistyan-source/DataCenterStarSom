/**
 * Cloud-first CRUD layer.
 * Writes go to both Supabase (cloud) and IndexedDB (offline cache).
 * Reads come from Supabase when online, IndexedDB when offline.
 */
import { supabase } from '@/integrations/supabase/client';
import {
  type Venue, type VenuePhoto, type VenueEvent, type PhotoCategory,
  getDB,
  getAllVenues as localGetAllVenues,
  getAllPhotos as localGetAllPhotos,
  getAllEvents as localGetAllEvents,
} from './db';
import { v4 as uuidv4 } from 'uuid';

async function getUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado');
  return user.id;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ─── VENUES ────────────────────────────────────────────────

export async function getAllVenues(): Promise<Venue[]> {
  try {
    const { data, error } = await supabase.from('venues').select('*');
    if (error) throw error;
    const venues: Venue[] = (data || []).map(v => ({
      id: v.id,
      name: v.name,
      city: v.city,
      address: v.address,
      lat: v.lat,
      lng: v.lng,
      venueType: v.venue_type,
      capacity: v.capacity,
      notes: v.notes,
      createdAt: v.created_at,
    }));
    // Cache locally
    const db = await getDB();
    const tx = db.transaction('venues', 'readwrite');
    await tx.objectStore('venues').clear();
    for (const v of venues) await tx.objectStore('venues').put(v);
    await tx.done;
    return venues;
  } catch {
    // Offline fallback
    return localGetAllVenues();
  }
}

export async function addVenue(venue: Omit<Venue, 'id' | 'createdAt'>): Promise<Venue> {
  const userId = await getUserId();
  const newVenue: Venue = { ...venue, id: uuidv4(), createdAt: new Date().toISOString() };

  // Write to cloud
  await supabase.from('venues').insert({
    id: newVenue.id,
    user_id: userId,
    name: newVenue.name,
    city: newVenue.city,
    address: newVenue.address,
    lat: newVenue.lat,
    lng: newVenue.lng,
    venue_type: newVenue.venueType,
    capacity: newVenue.capacity,
    notes: newVenue.notes,
    created_at: newVenue.createdAt,
  });

  // Cache locally
  const db = await getDB();
  await db.put('venues', newVenue);
  return newVenue;
}

export async function updateVenue(venue: Venue): Promise<void> {
  const userId = await getUserId();
  await supabase.from('venues').update({
    name: venue.name,
    city: venue.city,
    address: venue.address,
    lat: venue.lat,
    lng: venue.lng,
    venue_type: venue.venueType,
    capacity: venue.capacity,
    notes: venue.notes,
  }).eq('id', venue.id).eq('user_id', userId);

  const db = await getDB();
  await db.put('venues', venue);
}

export async function deleteVenue(id: string): Promise<void> {
  const userId = await getUserId();

  // Delete associated cloud data
  await supabase.from('photos').delete().eq('venue_id', id).eq('user_id', userId);
  await supabase.from('events').delete().eq('venue_id', id).eq('user_id', userId);
  await supabase.from('venues').delete().eq('id', id).eq('user_id', userId);

  // Delete locally
  const db = await getDB();
  const photos = await db.getAllFromIndex('photos', 'by-venue', id);
  const events = await db.getAllFromIndex('events', 'by-venue', id);
  const tx = db.transaction(['venues', 'photos', 'events'], 'readwrite');
  await Promise.all([
    ...photos.map(p => tx.objectStore('photos').delete(p.id)),
    ...events.map(e => tx.objectStore('events').delete(e.id)),
    tx.objectStore('venues').delete(id),
    tx.done,
  ]);
}

// ─── EVENTS ────────────────────────────────────────────────

export async function getAllEvents(): Promise<VenueEvent[]> {
  try {
    const { data, error } = await supabase.from('events').select('*');
    if (error) throw error;
    const events: VenueEvent[] = (data || []).map(e => ({
      id: e.id,
      venueId: e.venue_id,
      name: e.name,
      date: e.date,
      eventType: e.event_type,
      clientType: e.client_type,
      notes: e.notes,
      createdAt: e.created_at,
    }));
    const db = await getDB();
    const tx = db.transaction('events', 'readwrite');
    await tx.objectStore('events').clear();
    for (const e of events) await tx.objectStore('events').put(e);
    await tx.done;
    return events;
  } catch {
    return localGetAllEvents();
  }
}

export async function getEventsByVenue(venueId: string): Promise<VenueEvent[]> {
  try {
    const { data, error } = await supabase.from('events').select('*').eq('venue_id', venueId);
    if (error) throw error;
    return (data || []).map(e => ({
      id: e.id,
      venueId: e.venue_id,
      name: e.name,
      date: e.date,
      eventType: e.event_type,
      clientType: e.client_type,
      notes: e.notes,
      createdAt: e.created_at,
    }));
  } catch {
    const db = await getDB();
    return db.getAllFromIndex('events', 'by-venue', venueId);
  }
}

export async function addEvent(event: Omit<VenueEvent, 'id' | 'createdAt'>): Promise<VenueEvent> {
  const userId = await getUserId();
  const newEvent: VenueEvent = { ...event, id: uuidv4(), createdAt: new Date().toISOString() };

  await supabase.from('events').insert({
    id: newEvent.id,
    user_id: userId,
    venue_id: newEvent.venueId,
    name: newEvent.name,
    date: newEvent.date,
    event_type: newEvent.eventType,
    client_type: newEvent.clientType,
    notes: newEvent.notes,
    created_at: newEvent.createdAt,
  });

  const db = await getDB();
  await db.put('events', newEvent);
  return newEvent;
}

export async function deleteEvent(id: string): Promise<void> {
  const userId = await getUserId();
  await supabase.from('photos').delete().eq('event_id', id).eq('user_id', userId);
  await supabase.from('events').delete().eq('id', id).eq('user_id', userId);

  const db = await getDB();
  const photos = await db.getAllFromIndex('photos', 'by-event', id);
  const tx = db.transaction(['events', 'photos'], 'readwrite');
  await Promise.all([
    ...photos.map(p => tx.objectStore('photos').delete(p.id)),
    tx.objectStore('events').delete(id),
    tx.done,
  ]);
}

// ─── PHOTOS ────────────────────────────────────────────────

export async function getAllPhotos(): Promise<VenuePhoto[]> {
  try {
    const { data, error } = await supabase.from('photos').select('*');
    if (error) throw error;
    const photos: VenuePhoto[] = (data || []).map(p => ({
      id: p.id,
      venueId: p.venue_id,
      eventId: p.event_id || undefined,
      category: p.category as PhotoCategory,
      data: '', // media loaded on demand from storage
      mediaType: (p.media_type as any) || 'photo',
      mimeType: p.mime_type || undefined,
      thumbnail: '',
      caption: p.caption,
      tags: p.tags || [],
      createdAt: p.created_at,
      storagePath: p.storage_path || undefined,
      thumbnailPath: p.thumbnail_path || undefined,
    }));
    // Cache locally
    const db = await getDB();
    const tx = db.transaction('photos', 'readwrite');
    await tx.objectStore('photos').clear();
    for (const ph of photos) await tx.objectStore('photos').put(ph);
    await tx.done;
    return photos;
  } catch {
    return localGetAllPhotos();
  }
}

export async function getPhotosByVenue(venueId: string): Promise<VenuePhoto[]> {
  try {
    const { data, error } = await supabase.from('photos').select('*').eq('venue_id', venueId);
    if (error) throw error;
    return (data || []).map(p => ({
      id: p.id,
      venueId: p.venue_id,
      eventId: p.event_id || undefined,
      category: p.category as PhotoCategory,
      data: '',
      mediaType: (p.media_type as any) || 'photo',
      mimeType: p.mime_type || undefined,
      thumbnail: '',
      caption: p.caption,
      tags: p.tags || [],
      createdAt: p.created_at,
      storagePath: p.storage_path || undefined,
      thumbnailPath: p.thumbnail_path || undefined,
    }));
  } catch {
    const db = await getDB();
    return db.getAllFromIndex('photos', 'by-venue', venueId);
  }
}

export async function getPhotosByEvent(eventId: string): Promise<VenuePhoto[]> {
  try {
    const { data, error } = await supabase.from('photos').select('*').eq('event_id', eventId);
    if (error) throw error;
    return (data || []).map(p => ({
      id: p.id,
      venueId: p.venue_id,
      eventId: p.event_id || undefined,
      category: p.category as PhotoCategory,
      data: '',
      mediaType: (p.media_type as any) || 'photo',
      mimeType: p.mime_type || undefined,
      thumbnail: '',
      caption: p.caption,
      tags: p.tags || [],
      createdAt: p.created_at,
      storagePath: p.storage_path || undefined,
      thumbnailPath: p.thumbnail_path || undefined,
    }));
  } catch {
    const db = await getDB();
    return db.getAllFromIndex('photos', 'by-event', eventId);
  }
}

export async function addPhoto(photo: Omit<VenuePhoto, 'id' | 'createdAt'>): Promise<VenuePhoto> {
  const userId = await getUserId();
  const id = uuidv4();
  const createdAt = new Date().toISOString();
  let storagePath: string | null = null;
  let thumbnailPath: string | null = null;

  // Upload media to storage
  if (photo.blob) {
    const ext = photo.mimeType?.includes('mp4') ? 'mp4' : 'webm';
    storagePath = `${userId}/${photo.venueId}/${id}.${ext}`;
    await supabase.storage.from('media').upload(storagePath, photo.blob, {
      contentType: photo.mimeType || 'video/mp4',
      upsert: true,
    });
  } else if (photo.data) {
    const res = await fetch(photo.data);
    const blob = await res.blob();
    const ext = blob.type.includes('png') ? 'png' : 'jpg';
    storagePath = `${userId}/${photo.venueId}/${id}.${ext}`;
    await supabase.storage.from('media').upload(storagePath, blob, {
      contentType: blob.type,
      upsert: true,
    });
  }

  // Upload thumbnail
  if (photo.thumbnail) {
    const thumbRes = await fetch(photo.thumbnail);
    const thumbBlob = await thumbRes.blob();
    thumbnailPath = `${userId}/${photo.venueId}/${id}_thumb.jpg`;
    await supabase.storage.from('media').upload(thumbnailPath, thumbBlob, {
      contentType: 'image/jpeg',
      upsert: true,
    });
  }

  // Insert metadata
  await supabase.from('photos').insert({
    id,
    user_id: userId,
    venue_id: photo.venueId,
    event_id: photo.eventId || null,
    category: photo.category,
    media_type: photo.mediaType || 'photo',
    mime_type: photo.mimeType || null,
    caption: photo.caption,
    tags: photo.tags,
    storage_path: storagePath,
    thumbnail_path: thumbnailPath,
    created_at: createdAt,
  });

  const newPhoto: VenuePhoto = {
    ...photo,
    id,
    createdAt,
    storagePath: storagePath || undefined,
    thumbnailPath: thumbnailPath || undefined,
  };

  // Cache locally
  const db = await getDB();
  await db.put('photos', newPhoto);
  return newPhoto;
}

export async function deletePhoto(id: string): Promise<void> {
  const userId = await getUserId();

  // Get storage paths before deleting
  const { data: photoData } = await supabase.from('photos').select('storage_path, thumbnail_path').eq('id', id).single();
  if (photoData?.storage_path) {
    await supabase.storage.from('media').remove([photoData.storage_path]);
  }
  if (photoData?.thumbnail_path) {
    await supabase.storage.from('media').remove([photoData.thumbnail_path]);
  }

  await supabase.from('photos').delete().eq('id', id).eq('user_id', userId);

  const db = await getDB();
  await db.delete('photos', id);
}

export async function updatePhotoCategory(id: string, category: PhotoCategory): Promise<void> {
  const userId = await getUserId();
  await supabase.from('photos').update({ category }).eq('id', id).eq('user_id', userId);

  const db = await getDB();
  const photo = await db.get('photos', id);
  if (photo) {
    photo.category = category;
    await db.put('photos', photo);
  }
}

// ─── MEDIA URL HELPER ──────────────────────────────────────

export function getMediaUrl(photo: VenuePhoto & { storagePath?: string; thumbnailPath?: string }): { url: string; thumbUrl: string } {
  const sp = (photo as any).storagePath || '';
  const tp = (photo as any).thumbnailPath || '';

  let url = photo.data || '';
  let thumbUrl = photo.thumbnail || '';

  if (sp) {
    const { data } = supabase.storage.from('media').getPublicUrl(sp);
    url = data.publicUrl;
  }
  if (tp) {
    const { data } = supabase.storage.from('media').getPublicUrl(tp);
    thumbUrl = data.publicUrl;
  }

  return { url, thumbUrl };
}
