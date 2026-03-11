import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { v4 as uuidv4 } from 'uuid';

export interface PhotoTag {
  id: string;
  label: string;
}

export const PHOTO_TAGS: PhotoTag[] = [
  { id: 'lighting', label: 'Iluminação' },
  { id: 'stage', label: 'Palco' },
  { id: 'dancefloor', label: 'Pista' },
  { id: 'djbooth', label: 'DJ Booth' },
  { id: 'decoration', label: 'Decoração' },
  { id: 'structure', label: 'Estrutura' },
  { id: 'setup', label: 'Montagem' },
  { id: 'ambient', label: 'Ambiente' },
];

export const VENUE_TYPES = [
  'Salão', 'Clube', 'Igreja', 'Área Externa', 'Restaurante',
  'Hotel', 'Chácara', 'Espaço de Eventos', 'Outro'
] as const;

export const EVENT_TYPES = [
  'Casamento', 'Aniversário', 'Corporativo', 'Formatura',
  'Baile', 'Show', 'Festival', 'Outro'
] as const;

export type PhotoCategory = 'evento' | 'estrutura';

export interface VenuePhoto {
  id: string;
  venueId: string;
  eventId?: string;
  category: PhotoCategory;
  data: string; // base64
  caption: string;
  tags: string[];
  createdAt: string;
}

export interface VenueEvent {
  id: string;
  venueId: string;
  name: string;
  date: string;
  eventType: string;
  clientType: string;
  notes: string;
  createdAt: string;
}

export interface Venue {
  id: string;
  name: string;
  city: string;
  address: string;
  lat: number;
  lng: number;
  venueType: string;
  capacity: string;
  notes: string;
  createdAt: string;
}

interface EventPortfolioDB extends DBSchema {
  venues: {
    key: string;
    value: Venue;
    indexes: { 'by-city': string; 'by-type': string };
  };
  photos: {
    key: string;
    value: VenuePhoto;
    indexes: { 'by-venue': string; 'by-event': string };
  };
  events: {
    key: string;
    value: VenueEvent;
    indexes: { 'by-venue': string };
  };
}

let dbInstance: IDBPDatabase<EventPortfolioDB> | null = null;

export async function getDB() {
  if (dbInstance) return dbInstance;
  dbInstance = await openDB<EventPortfolioDB>('event-portfolio', 1, {
    upgrade(db) {
      const venueStore = db.createObjectStore('venues', { keyPath: 'id' });
      venueStore.createIndex('by-city', 'city');
      venueStore.createIndex('by-type', 'venueType');

      const photoStore = db.createObjectStore('photos', { keyPath: 'id' });
      photoStore.createIndex('by-venue', 'venueId');
      photoStore.createIndex('by-event', 'eventId');

      const eventStore = db.createObjectStore('events', { keyPath: 'id' });
      eventStore.createIndex('by-venue', 'venueId');
    },
  });
  return dbInstance;
}

// Venue CRUD
export async function getAllVenues(): Promise<Venue[]> {
  const db = await getDB();
  return db.getAll('venues');
}

export async function addVenue(venue: Omit<Venue, 'id' | 'createdAt'>): Promise<Venue> {
  const db = await getDB();
  const newVenue: Venue = { ...venue, id: uuidv4(), createdAt: new Date().toISOString() };
  await db.put('venues', newVenue);
  return newVenue;
}

export async function updateVenue(venue: Venue): Promise<void> {
  const db = await getDB();
  await db.put('venues', venue);
}

export async function deleteVenue(id: string): Promise<void> {
  const db = await getDB();
  // Delete associated photos and events
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

// Photo CRUD
export async function getPhotosByVenue(venueId: string): Promise<VenuePhoto[]> {
  const db = await getDB();
  return db.getAllFromIndex('photos', 'by-venue', venueId);
}

export async function getPhotosByEvent(eventId: string): Promise<VenuePhoto[]> {
  const db = await getDB();
  return db.getAllFromIndex('photos', 'by-event', eventId);
}

export async function addPhoto(photo: Omit<VenuePhoto, 'id' | 'createdAt'>): Promise<VenuePhoto> {
  const db = await getDB();
  const newPhoto: VenuePhoto = { ...photo, id: uuidv4(), createdAt: new Date().toISOString() };
  await db.put('photos', newPhoto);
  return newPhoto;
}

export async function deletePhoto(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('photos', id);
}

// Event CRUD
export async function getEventsByVenue(venueId: string): Promise<VenueEvent[]> {
  const db = await getDB();
  return db.getAllFromIndex('events', 'by-venue', venueId);
}

export async function addEvent(event: Omit<VenueEvent, 'id' | 'createdAt'>): Promise<VenueEvent> {
  const db = await getDB();
  const newEvent: VenueEvent = { ...event, id: uuidv4(), createdAt: new Date().toISOString() };
  await db.put('events', newEvent);
  return newEvent;
}

export async function deleteEvent(id: string): Promise<void> {
  const db = await getDB();
  // Delete associated photos
  const photos = await db.getAllFromIndex('photos', 'by-event', id);
  const tx = db.transaction(['events', 'photos'], 'readwrite');
  await Promise.all([
    ...photos.map(p => tx.objectStore('photos').delete(p.id)),
    tx.objectStore('events').delete(id),
    tx.done,
  ]);
}

// Export/Import
export async function exportDatabase(): Promise<string> {
  const db = await getDB();
  const data = {
    venues: await db.getAll('venues'),
    photos: await db.getAll('photos'),
    events: await db.getAll('events'),
    exportedAt: new Date().toISOString(),
  };
  return JSON.stringify(data);
}

export async function importDatabase(jsonStr: string): Promise<void> {
  const data = JSON.parse(jsonStr);
  const db = await getDB();
  const tx = db.transaction(['venues', 'photos', 'events'], 'readwrite');
  
  // Clear existing
  await tx.objectStore('venues').clear();
  await tx.objectStore('photos').clear();
  await tx.objectStore('events').clear();

  for (const v of data.venues || []) await tx.objectStore('venues').put(v);
  for (const p of data.photos || []) await tx.objectStore('photos').put(p);
  for (const e of data.events || []) await tx.objectStore('events').put(e);
  
  await tx.done;
}

export async function getAllPhotos(): Promise<VenuePhoto[]> {
  const db = await getDB();
  return db.getAll('photos');
}

export async function getAllEvents(): Promise<VenueEvent[]> {
  const db = await getDB();
  return db.getAll('events');
}
