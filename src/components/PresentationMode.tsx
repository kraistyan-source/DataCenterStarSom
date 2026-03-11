import { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { getPhotosByVenue } from '@/lib/db';
import type { VenuePhoto } from '@/lib/db';
import { motion } from 'framer-motion';

export default function PresentationMode() {
  const { presentationMode, setPresentationMode, presentationCity, setPresentationCity, venues, photos } = useApp();
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  const [venuePhotos, setVenuePhotos] = useState<VenuePhoto[]>([]);
  const [photoIndex, setPhotoIndex] = useState(0);

  const cities = [...new Set(venues.map(v => v.city))].sort();
  const cityVenues = venues.filter(v => v.city === presentationCity);

  useEffect(() => {
    if (!presentationMode) {
      setSelectedVenueId(null);
      setVenuePhotos([]);
    }
  }, [presentationMode]);

  useEffect(() => {
    if (selectedVenueId) {
      getPhotosByVenue(selectedVenueId).then(p => {
        setVenuePhotos(p);
        setPhotoIndex(0);
      });
    }
  }, [selectedVenueId]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (selectedVenueId) {
        setSelectedVenueId(null);
      } else {
        setPresentationMode(false);
      }
    }
    if (selectedVenueId && venuePhotos.length > 0) {
      if (e.key === 'ArrowRight' && photoIndex < venuePhotos.length - 1) setPhotoIndex(i => i + 1);
      if (e.key === 'ArrowLeft' && photoIndex > 0) setPhotoIndex(i => i - 1);
    }
  }, [selectedVenueId, venuePhotos, photoIndex, setPresentationMode]);

  useEffect(() => {
    if (!presentationMode) return;
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [presentationMode, handleKeyDown]);

  if (!presentationMode) return null;

  // Fullscreen photo carousel
  if (selectedVenueId && venuePhotos.length > 0) {
    const venue = venues.find(v => v.id === selectedVenueId);
    const photo = venuePhotos[photoIndex];
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-[6000] bg-nocturne flex items-center justify-center"
      >
        <img src={photo.data} alt="" className="max-w-[95vw] max-h-[90vh] object-contain" />

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-center">
          <p className="text-sm text-foreground font-mono">{venue?.name}</p>
          <p className="text-[10px] text-muted-foreground mt-1">{photoIndex + 1} / {venuePhotos.length}</p>
        </div>

        <button onClick={() => setSelectedVenueId(null)} className="absolute top-6 right-6 text-muted-foreground hover:text-foreground">
          <X className="w-6 h-6" />
        </button>

        {photoIndex > 0 && (
          <button onClick={() => setPhotoIndex(i => i - 1)} className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <ChevronLeft className="w-10 h-10" />
          </button>
        )}
        {photoIndex < venuePhotos.length - 1 && (
          <button onClick={() => setPhotoIndex(i => i + 1)} className="absolute right-6 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <ChevronRight className="w-10 h-10" />
          </button>
        )}
      </motion.div>
    );
  }

  // City selection + venue grid
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[6000] bg-nocturne flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-border">
        <div>
          <h1 className="text-lg font-semibold text-foreground tracking-wider uppercase">Modo Apresentação</h1>
          <p className="text-xs text-muted-foreground mt-1">Pressione ESC para sair</p>
        </div>
        <button onClick={() => setPresentationMode(false)} className="text-muted-foreground hover:text-foreground">
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* City selector */}
      <div className="flex gap-2 p-6 border-b border-border flex-wrap">
        {cities.map(c => (
          <button
            key={c}
            onClick={() => setPresentationCity(c)}
            className={`text-xs px-4 py-2 border transition-colors ${
              presentationCity === c
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Venue grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {cityVenues.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-20 font-body">
            {cities.length === 0 ? 'Nenhum local cadastrado' : 'Selecione uma cidade'}
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {cityVenues.map(v => {
              const vPhotos = photos.filter(p => p.venueId === v.id);
              const thumb = vPhotos[0];
              return (
                <button
                  key={v.id}
                  onClick={() => { if (vPhotos.length > 0) setSelectedVenueId(v.id); }}
                  className="group border border-border overflow-hidden text-left transition-colors hover:border-primary"
                >
                  {thumb ? (
                    <div className="aspect-video overflow-hidden">
                      <img src={thumb.data} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    </div>
                  ) : (
                    <div className="aspect-video bg-muted flex items-center justify-center">
                      <span className="text-xs text-muted-foreground">Sem fotos</span>
                    </div>
                  )}
                  <div className="p-3">
                    <div className="text-xs font-medium text-foreground">{v.name}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{v.venueType} · {vPhotos.length} fotos</div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}
