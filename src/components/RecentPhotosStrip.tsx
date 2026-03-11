import { useMemo, useState } from 'react';
import { Camera, X, ChevronLeft, Play } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { useMediaUrls } from '@/hooks/use-media-url';

export default function RecentPhotosStrip() {
  const { photos, venues, events, openFullscreen } = useApp();
  const [collapsed, setCollapsed] = useState(false);

  const recentPhotos = useMemo(() => {
    return [...photos]
      .filter(p => p.category === 'evento')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 12);
  }, [photos]);

  const getPhotoMeta = (photo: typeof recentPhotos[0]) => {
    const venue = venues.find(v => v.id === photo.venueId);
    const event = photo.eventId ? events.find(e => e.id === photo.eventId) : null;
    return { venueName: venue?.name || '', eventName: event?.name || '' };
  };
  const mediaUrls = useMediaUrls(recentPhotos);

  if (recentPhotos.length === 0) return null;

  return (
    <div className="absolute top-3 right-3 z-[900] flex flex-col items-end gap-1">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-1.5 bg-card/90 backdrop-blur-sm border border-border px-2.5 py-1.5 text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
      >
        <Camera className="w-3 h-3" />
        Últimas fotos
        {collapsed ? <ChevronLeft className="w-3 h-3" /> : <X className="w-3 h-3" />}
      </button>

      {!collapsed && (
        <div className="bg-card/90 backdrop-blur-sm border border-border p-2 flex gap-1.5 max-w-[420px] overflow-x-auto scrollbar-thin">
          {recentPhotos.map((photo, idx) => {
            const meta = getPhotoMeta(photo);
            return (
              <button
                key={photo.id}
                onClick={() => openFullscreen(recentPhotos, idx)}
                className="shrink-0 relative group"
                title={`${meta.venueName}${meta.eventName ? ` · ${meta.eventName}` : ''}`}
              >
                {photo.mediaType === 'video' ? (
                  <div className="relative w-14 h-14">
                    <video src={mediaUrls[photo.id] || ''} className="w-full h-full object-cover border border-border hover:border-primary transition-colors" muted preload="metadata" />
                    <Play className="absolute inset-0 m-auto w-4 h-4 text-primary-foreground drop-shadow" />
                  </div>
                ) : (
                  <img
                    src={mediaUrls[photo.id] || photo.data}
                    alt={photo.caption || meta.venueName}
                    className="w-14 h-14 object-cover border border-border hover:border-primary transition-colors"
                  />
                )}
                <div className="absolute inset-x-0 bottom-0 bg-nocturne/70 text-[7px] text-foreground px-0.5 py-px truncate opacity-0 group-hover:opacity-100 transition-opacity">
                  {meta.venueName}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
