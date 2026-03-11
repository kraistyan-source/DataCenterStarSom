import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { Venue, VenuePhoto, VenueEvent } from '@/lib/db';
import { getAllVenues, getAllPhotos, getAllEvents } from '@/lib/db';
import { type FilterState, defaultFilters } from '@/lib/store';
import { type HomeBase, getHomeBase, setHomeBase as saveHomeBase } from '@/lib/distance';

interface AppState {
  venues: Venue[];
  photos: VenuePhoto[];
  events: VenueEvent[];
  selectedVenueId: string | null;
  filters: FilterState;
  presentationMode: boolean;
  presentationCity: string | null;
  fullscreenPhotoIndex: number | null;
  fullscreenPhotos: VenuePhoto[];
  setSelectedVenueId: (id: string | null) => void;
  setFilters: (f: Partial<FilterState>) => void;
  setPresentationMode: (on: boolean) => void;
  setPresentationCity: (city: string | null) => void;
  openFullscreen: (photos: VenuePhoto[], index: number) => void;
  closeFullscreen: () => void;
  refresh: () => Promise<void>;
  addingMarker: boolean;
  setAddingMarker: (v: boolean) => void;
  homeBase: HomeBase | null;
  setHomeBase: (hb: HomeBase | null) => void;
  settingHomeBase: boolean;
  setSettingHomeBase: (v: boolean) => void;
}

const AppContext = createContext<AppState | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [photos, setPhotos] = useState<VenuePhoto[]>([]);
  const [events, setEvents] = useState<VenueEvent[]>([]);
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<FilterState>(defaultFilters);
  const [presentationMode, setPresentationMode] = useState(false);
  const [presentationCity, setPresentationCity] = useState<string | null>(null);
  const [fullscreenPhotoIndex, setFullscreenPhotoIndex] = useState<number | null>(null);
  const [fullscreenPhotos, setFullscreenPhotos] = useState<VenuePhoto[]>([]);
  const [addingMarker, setAddingMarker] = useState(false);
  const [homeBase, setHomeBaseState] = useState<HomeBase | null>(getHomeBase());
  const [settingHomeBase, setSettingHomeBase] = useState(false);

  const setHomeBase = useCallback((hb: HomeBase | null) => {
    if (hb) saveHomeBase(hb);
    setHomeBaseState(hb);
  }, []);

  const refresh = useCallback(async () => {
    const [v, p, e] = await Promise.all([getAllVenues(), getAllPhotos(), getAllEvents()]);
    setVenues(v);
    setPhotos(p);
    setEvents(e);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const setFilters = useCallback((partial: Partial<FilterState>) => {
    setFiltersState(prev => ({ ...prev, ...partial }));
  }, []);

  const openFullscreen = useCallback((photos: VenuePhoto[], index: number) => {
    setFullscreenPhotos(photos);
    setFullscreenPhotoIndex(index);
  }, []);

  const closeFullscreen = useCallback(() => {
    setFullscreenPhotoIndex(null);
    setFullscreenPhotos([]);
  }, []);

  return (
    <AppContext.Provider value={{
      venues, photos, events,
      selectedVenueId, setSelectedVenueId,
      filters, setFilters,
      presentationMode, setPresentationMode,
      presentationCity, setPresentationCity,
      fullscreenPhotoIndex, fullscreenPhotos, openFullscreen, closeFullscreen,
      refresh,
      addingMarker, setAddingMarker,
      homeBase, setHomeBase, settingHomeBase, setSettingHomeBase,
    }}>
      {children}
    </AppContext.Provider>
  );
}
