import { useState, useMemo } from 'react';
import { Search, MapPin, Camera, Calendar } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { distanceKm } from '@/lib/distance';

export default function MobileVenueList() {
  const { venues, photos, events, setSelectedVenueId, homeBase, roadDistances } = useApp();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search) return venues;
    const s = search.toLowerCase();
    return venues.filter(v =>
      v.name.toLowerCase().includes(s) || v.city.toLowerCase().includes(s)
    );
  }, [venues, search]);

  return (
    <div className="fixed inset-0 z-[1500] bg-background flex flex-col pb-14">
      {/* Search */}
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar local ou cidade..."
            className="w-full bg-muted text-foreground text-sm pl-9 pr-3 py-2.5 border border-border focus:outline-none focus:border-primary placeholder:text-muted-foreground font-mono rounded-none"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-8 text-center">
            <MapPin className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-30" />
            <p className="text-sm text-muted-foreground font-body">
              {venues.length === 0 ? 'Nenhum local cadastrado' : 'Nenhum resultado'}
            </p>
          </div>
        ) : (
          filtered.map(v => {
            const venuePhotos = photos.filter(p => p.venueId === v.id);
            const venueEvents = events.filter(e => e.venueId === v.id);
            const distText = homeBase ? (() => {
              const km = roadDistances[v.id];
              if (km !== undefined) return km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`;
              return `~${distanceKm(homeBase.lat, homeBase.lng, v.lat, v.lng).toFixed(1)}km`;
            })() : null;

            return (
              <button
                key={v.id}
                onClick={() => setSelectedVenueId(v.id)}
                className="w-full text-left p-4 border-b border-border hover:bg-muted/50 active:bg-muted transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-foreground truncate">{v.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                      <span>{v.city}</span>
                      <span>·</span>
                      <span>{v.venueType}</span>
                      {distText && (
                        <>
                          <span>·</span>
                          <span className="text-primary">{distText}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground shrink-0 ml-2">
                    <span className="flex items-center gap-0.5">
                      <Camera className="w-3 h-3" />
                      {venuePhotos.length}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Calendar className="w-3 h-3" />
                      {venueEvents.length}
                    </span>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
