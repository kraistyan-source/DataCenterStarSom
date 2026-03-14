import { supabase } from '@/integrations/supabase/client';
import { getAllVenues, getAllPhotos, getAllEvents, getDB } from './db';
import type { Venue, VenuePhoto, VenueEvent } from './db';
import { v4 as uuidv4 } from 'uuid';

async function getCurrentUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado');
  return user.id;
}

export type SyncStatus = 'idle' | 'uploading' | 'downloading' | 'error' | 'done';

export interface SyncProgress {
  status: SyncStatus;
  message: string;
  current: number;
  total: number;
}

// Upload local IndexedDB data to cloud
export async function uploadToCloud(
  onProgress?: (p: SyncProgress) => void
): Promise<void> {
  const report = (status: SyncStatus, message: string, current = 0, total = 0) =>
    onProgress?.({ status, message, current, total });

  try {
    report('uploading', 'Lendo dados locais…');
    const userId = await getCurrentUserId();
    const [venues, photos, events] = await Promise.all([
      getAllVenues(), getAllPhotos(), getAllEvents()
    ]);

    const totalItems = venues.length + events.length + photos.length;
    let done = 0;

    // 1. Upload venues
    report('uploading', 'Enviando locais…', done, totalItems);
    for (const v of venues) {
      await supabase.from('venues').upsert({
        id: v.id,
        user_id: userId,
        name: v.name,
        city: v.city,
        address: v.address,
        lat: v.lat,
        lng: v.lng,
        venue_type: v.venueType,
        capacity: v.capacity,
        notes: v.notes,
        created_at: v.createdAt,
      }, { onConflict: 'id' });
      done++;
      report('uploading', `Locais: ${done}/${venues.length}`, done, totalItems);
    }

    // 2. Upload events
    report('uploading', 'Enviando eventos…', done, totalItems);
    for (const e of events) {
      await supabase.from('events').upsert({
        id: e.id,
        venue_id: e.venueId,
        name: e.name,
        date: e.date,
        event_type: e.eventType,
        client_type: e.clientType,
        notes: e.notes,
        created_at: e.createdAt,
      }, { onConflict: 'id' });
      done++;
      report('uploading', `Eventos: ${done - venues.length}/${events.length}`, done, totalItems);
    }

    // 3. Upload photos (media to storage, metadata to table)
    report('uploading', 'Enviando fotos…', done, totalItems);
    for (const p of photos) {
      let storagePath: string | null = null;
      let thumbnailPath: string | null = null;

      // Upload media blob or base64
      if (p.blob) {
        const ext = p.mimeType?.includes('mp4') ? 'mp4' : 'webm';
        storagePath = `${p.venueId}/${p.id}.${ext}`;
        await supabase.storage.from('media').upload(storagePath, p.blob, {
          contentType: p.mimeType || 'video/mp4',
          upsert: true,
        });
      } else if (p.data) {
        // Convert base64 to blob for storage
        const res = await fetch(p.data);
        const blob = await res.blob();
        const ext = blob.type.includes('png') ? 'png' : 'jpg';
        storagePath = `${p.venueId}/${p.id}.${ext}`;
        await supabase.storage.from('media').upload(storagePath, blob, {
          contentType: blob.type,
          upsert: true,
        });
      }

      // Upload thumbnail
      if (p.thumbnail) {
        const thumbRes = await fetch(p.thumbnail);
        const thumbBlob = await thumbRes.blob();
        thumbnailPath = `${p.venueId}/${p.id}_thumb.jpg`;
        await supabase.storage.from('media').upload(thumbnailPath, thumbBlob, {
          contentType: 'image/jpeg',
          upsert: true,
        });
      }

      await supabase.from('photos').upsert({
        id: p.id,
        venue_id: p.venueId,
        event_id: p.eventId || null,
        category: p.category,
        media_type: p.mediaType || 'photo',
        mime_type: p.mimeType || null,
        caption: p.caption,
        tags: p.tags,
        storage_path: storagePath,
        thumbnail_path: thumbnailPath,
        created_at: p.createdAt,
      }, { onConflict: 'id' });

      done++;
      report('uploading', `Mídia: ${done - venues.length - events.length}/${photos.length}`, done, totalItems);
    }

    report('done', 'Backup concluído!', totalItems, totalItems);
  } catch (err: any) {
    console.error('Cloud sync upload error:', err);
    report('error', `Erro: ${err.message || 'Falha no upload'}`);
    throw err;
  }
}

// Download cloud data to local IndexedDB
export async function downloadFromCloud(
  onProgress?: (p: SyncProgress) => void
): Promise<void> {
  const report = (status: SyncStatus, message: string, current = 0, total = 0) =>
    onProgress?.({ status, message, current, total });

  try {
    report('downloading', 'Baixando dados da nuvem…');

    // Fetch all data from cloud
    const { data: cloudVenues } = await supabase.from('venues').select('*');
    const { data: cloudEvents } = await supabase.from('events').select('*');
    const { data: cloudPhotos } = await supabase.from('photos').select('*');

    if (!cloudVenues || !cloudEvents || !cloudPhotos) {
      report('error', 'Não há dados na nuvem');
      return;
    }

    const totalItems = cloudVenues.length + cloudEvents.length + cloudPhotos.length;
    let done = 0;

    const db = await getDB();

    // Clear local data
    const tx = db.transaction(['venues', 'photos', 'events'], 'readwrite');
    await tx.objectStore('venues').clear();
    await tx.objectStore('photos').clear();
    await tx.objectStore('events').clear();
    await tx.done;

    // Import venues
    for (const v of cloudVenues) {
      const venue: Venue = {
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
      };
      await db.put('venues', venue);
      done++;
      report('downloading', `Locais: ${done}/${cloudVenues.length}`, done, totalItems);
    }

    // Import events
    for (const e of cloudEvents) {
      const event: VenueEvent = {
        id: e.id,
        venueId: e.venue_id,
        name: e.name,
        date: e.date,
        eventType: e.event_type,
        clientType: e.client_type,
        notes: e.notes,
        createdAt: e.created_at,
      };
      await db.put('events', event);
      done++;
      report('downloading', `Eventos: ${done - cloudVenues.length}/${cloudEvents.length}`, done, totalItems);
    }

    // Import photos (download media from storage)
    for (const p of cloudPhotos) {
      let data = '';
      let blob: Blob | undefined;
      let thumbnail = '';

      // Download media file
      if (p.storage_path) {
        const { data: publicUrl } = supabase.storage.from('media').getPublicUrl(p.storage_path);
        if (p.media_type === 'video') {
          const res = await fetch(publicUrl.publicUrl);
          blob = await res.blob();
        } else {
          // For photos, convert to base64
          const res = await fetch(publicUrl.publicUrl);
          const fileBlob = await res.blob();
          data = await blobToBase64(fileBlob);
        }
      }

      // Download thumbnail
      if (p.thumbnail_path) {
        const { data: thumbUrl } = supabase.storage.from('media').getPublicUrl(p.thumbnail_path);
        const res = await fetch(thumbUrl.publicUrl);
        const thumbBlob = await res.blob();
        thumbnail = await blobToBase64(thumbBlob);
      }

      const photo: VenuePhoto = {
        id: p.id,
        venueId: p.venue_id,
        eventId: p.event_id || undefined,
        category: p.category as any,
        data,
        mediaType: (p.media_type as any) || 'photo',
        blob,
        mimeType: p.mime_type || undefined,
        thumbnail,
        caption: p.caption,
        tags: p.tags || [],
        createdAt: p.created_at,
      };
      await db.put('photos', photo);
      done++;
      report('downloading', `Mídia: ${done - cloudVenues.length - cloudEvents.length}/${cloudPhotos.length}`, done, totalItems);
    }

    report('done', 'Restauração concluída!', totalItems, totalItems);
  } catch (err: any) {
    console.error('Cloud sync download error:', err);
    report('error', `Erro: ${err.message || 'Falha no download'}`);
    throw err;
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
