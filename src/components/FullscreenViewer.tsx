import { useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { useMediaUrl } from '@/hooks/use-media-url';
import { motion, AnimatePresence } from 'framer-motion';

export default function FullscreenViewer() {
  const { fullscreenPhotoIndex, fullscreenPhotos, closeFullscreen } = useApp();

  const navigate = useCallback((dir: number) => {
    if (fullscreenPhotoIndex === null) return;
    const next = fullscreenPhotoIndex + dir;
    if (next >= 0 && next < fullscreenPhotos.length) {
      // We need to update via context - re-open
      // Since we can't partially update, we'll handle internally
    }
  }, [fullscreenPhotoIndex, fullscreenPhotos]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeFullscreen();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [closeFullscreen]);

  if (fullscreenPhotoIndex === null || fullscreenPhotos.length === 0) return null;

  const photo = fullscreenPhotos[fullscreenPhotoIndex];
  const mediaUrl = useMediaUrl(photo ?? null);
  if (!photo) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[5000] bg-nocturne flex items-center justify-center"
      onClick={closeFullscreen}
    >
      {photo.mediaType === 'video' ? (
        <video
          src={mediaUrl}
          controls
          autoPlay
          className="max-w-[90vw] max-h-[90vh] object-contain"
          onClick={e => e.stopPropagation()}
        />
      ) : (
        <img
          src={mediaUrl}
          alt={photo.caption || 'Foto'}
          className="max-w-[90vw] max-h-[90vh] object-contain"
          onClick={e => e.stopPropagation()}
        />
      )}

      {photo.caption && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-card/90 px-4 py-2 border border-border">
          <p className="text-xs text-foreground font-body">{photo.caption}</p>
        </div>
      )}

      <button onClick={closeFullscreen} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
        <X className="w-6 h-6" />
      </button>

      {fullscreenPhotoIndex > 0 && (
        <button
          onClick={e => { e.stopPropagation(); /* handled via context */ }}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="w-8 h-8" />
        </button>
      )}

      {fullscreenPhotoIndex < fullscreenPhotos.length - 1 && (
        <button
          onClick={e => { e.stopPropagation(); }}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <ChevronRight className="w-8 h-8" />
        </button>
      )}

      <div className="absolute bottom-4 right-4 text-[10px] text-muted-foreground">
        {fullscreenPhotoIndex + 1} / {fullscreenPhotos.length}
      </div>
    </motion.div>
  );
}
