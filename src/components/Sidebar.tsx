import { useState, useMemo } from 'react';
import { Search, MapPin, Download, Upload, Presentation, Plus, Home, Clock, Pin } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { VENUE_TYPES, EVENT_TYPES } from '@/lib/db';
import { exportDatabase, importDatabase } from '@/lib/db';
import { distanceKm } from '@/lib/distance';
import { getPinnedPhotos } from '@/lib/store';

export default function Sidebar() {
  const {
    venues, filters, setFilters,
    selectedVenueId, setSelectedVenueId,
    setPresentationMode, setPresentationCity,
    addingMarker, setAddingMarker,
    refresh, photos, events,
    homeBase, settingHomeBase, setSettingHomeBase,
    roadDistances,
  } = useApp();

  const [importing, setImporting] = useState(false);

  const cities = [...new Set(venues.map(v => v.city))].sort();
  const eventTypes = [...new Set(events.map(e => e.eventType))].filter(Boolean).sort();

  // Compute venue IDs from the last N events (same logic as map)
  const lastNEventVenueIds = useMemo(() => {
    if (!filters.lastNEvents) return null;
    const sorted = [...events].sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime());
    const lastN = sorted.slice(0, filters.lastNEvents);
    return new Set(lastN.map(e => e.venueId));
  }, [events, filters.lastNEvents]);

  const filteredVenues = venues.filter(v => {
    if (lastNEventVenueIds && !lastNEventVenueIds.has(v.id)) return false;
    if (filters.city && v.city !== filters.city) return false;
    if (filters.venueType && v.venueType !== filters.venueType) return false;
    if (filters.search) {
      const s = filters.search.toLowerCase();
      if (!v.name.toLowerCase().includes(s) && !v.city.toLowerCase().includes(s)) return false;
    }
    if (filters.eventType) {
      const venueEvents = events.filter(e => e.venueId === v.id);
      if (!venueEvents.some(e => e.eventType === filters.eventType)) return false;
    }
    return true;
  });

  const handleExport = async () => {
    const json = await exportDatabase();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `event-portfolio-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      await importDatabase(text);
      await refresh();
    } catch {
      alert('Erro ao importar banco de dados');
    }
    setImporting(false);
    e.target.value = '';
  };

  const handlePresentation = () => {
    setPresentationMode(true);
    if (cities.length > 0) setPresentationCity(cities[0]);
  };

  return (
    <div className="w-80 h-full bg-card border-r border-border flex flex-col overflow-hidden shrink-0">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h1 className="text-sm font-semibold text-foreground tracking-wider uppercase">
          Event Portfolio
        </h1>
        <p className="text-xs text-muted-foreground mt-1 font-body">
          Norte de Santa Catarina
        </p>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar local ou cidade..."
            className="w-full bg-muted text-foreground text-xs pl-9 pr-3 py-2 border border-border focus:outline-none focus:border-primary placeholder:text-muted-foreground font-mono"
            value={filters.search}
            onChange={e => setFilters({ search: e.target.value })}
          />
        </div>
      </div>

      {/* Filters */}
      <div className="p-3 border-b border-border space-y-3 overflow-y-auto max-h-48">
        <div>
          <label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 block">Cidade</label>
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setFilters({ city: '' })}
              className={`text-[10px] px-2 py-0.5 border transition-colors ${
                !filters.city ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              Todas
            </button>
            {cities.map(c => (
              <button
                key={c}
                onClick={() => setFilters({ city: c })}
                className={`text-[10px] px-2 py-0.5 border transition-colors ${
                  filters.city === c ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 block">Tipo de Local</label>
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setFilters({ venueType: '' })}
              className={`text-[10px] px-2 py-0.5 border transition-colors ${
                !filters.venueType ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              Todos
            </button>
            {VENUE_TYPES.map(t => (
              <button
                key={t}
                onClick={() => setFilters({ venueType: t })}
                className={`text-[10px] px-2 py-0.5 border transition-colors ${
                  filters.venueType === t ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 block">Tipo de Evento</label>
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setFilters({ eventType: '' })}
              className={`text-[10px] px-2 py-0.5 border transition-colors ${
                !filters.eventType ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              Todos
            </button>
            {[...EVENT_TYPES, ...eventTypes.filter(et => !(EVENT_TYPES as readonly string[]).includes(et))].map(t => (
              <button
                key={t}
                onClick={() => setFilters({ eventType: t })}
                className={`text-[10px] px-2 py-0.5 border transition-colors ${
                  filters.eventType === t ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        {/* Last N Events filter */}
        <div>
          <label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 block">Recentes</label>
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setFilters({ lastNEvents: null })}
              className={`text-[10px] px-2 py-0.5 border transition-colors ${
                !filters.lastNEvents ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilters({ lastNEvents: filters.lastNEvents === 5 ? null : 5 })}
              className={`text-[10px] px-2 py-0.5 border transition-colors flex items-center gap-1 ${
                filters.lastNEvents === 5 ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              <Clock className="w-3 h-3" />
              Últimos 5
            </button>
          </div>
        </div>
      </div>

      {/* Pinned Photos Section */}
      {(() => {
        const pinned = getPinnedPhotos();
        if (pinned.length === 0) return null;
        const pinnedPhotoObjects = pinned.map(p => photos.find(ph => ph.id === p.photoId)).filter(Boolean);
        if (pinnedPhotoObjects.length === 0) return null;
        return (
          <div className="p-3 border-b border-border">
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 block flex items-center gap-1">
              <Pin className="w-3 h-3 text-primary" />
              Destaques ({pinnedPhotoObjects.length}/3)
            </label>
            <div className="flex gap-1">
              {pinnedPhotoObjects.map((p) => p && (
                <div
                  key={p.id}
                  className="w-16 h-16 bg-muted overflow-hidden cursor-pointer border border-primary/40 hover:border-primary transition-colors"
                  onClick={() => {
                    const venue = venues.find(v => v.id === p.venueId);
                    if (venue) setSelectedVenueId(venue.id);
                  }}
                >
                  {p.thumbnail ? (
                    <img src={p.thumbnail} alt="Destaque" className="w-full h-full object-cover" />
                  ) : p.mediaType === 'video' ? (
                    <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground text-[8px]">VID</div>
                  ) : (
                    <img src={p.data} alt="Destaque" className="w-full h-full object-cover" />
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Actions */}
      <div className="p-3 border-b border-border flex gap-2">
        <button
          onClick={() => setAddingMarker(!addingMarker)}
          className={`flex-1 flex items-center justify-center gap-1.5 text-[10px] uppercase tracking-wider py-2 border transition-colors ${
            addingMarker
              ? 'bg-primary text-primary-foreground border-primary'
              : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground'
          }`}
        >
          <Plus className="w-3 h-3" />
          {addingMarker ? 'Clique no mapa' : 'Adicionar'}
        </button>
        <button
          onClick={() => setSettingHomeBase(!settingHomeBase)}
          className={`flex items-center justify-center gap-1.5 text-[10px] uppercase tracking-wider py-2 px-3 border transition-colors ${
            settingHomeBase
              ? 'bg-primary text-primary-foreground border-primary'
              : homeBase
                ? 'border-primary/50 text-primary hover:border-primary'
                : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground'
          }`}
          title={homeBase ? 'Reposicionar empresa' : 'Definir local da empresa'}
        >
          <Home className="w-3 h-3" />
        </button>
        <button
          onClick={handlePresentation}
          className="flex items-center justify-center gap-1.5 text-[10px] uppercase tracking-wider py-2 px-3 border border-border text-muted-foreground hover:text-foreground hover:border-secondary transition-colors"
          title="Modo Apresentação"
        >
          <Presentation className="w-3 h-3" />
        </button>
      </div>

      {/* Venue List */}
      <div className="flex-1 overflow-y-auto">
        {filteredVenues.length === 0 ? (
          <div className="p-6 text-center">
            <MapPin className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-30" />
            <p className="text-xs text-muted-foreground font-body">
              {venues.length === 0 ? 'Clique no mapa para adicionar um local' : 'Nenhum local encontrado'}
            </p>
          </div>
        ) : (
          filteredVenues.map(v => {
            const venuePhotos = photos.filter(p => p.venueId === v.id);
            const venueEvents = events.filter(e => e.venueId === v.id);
            return (
              <button
                key={v.id}
                onClick={() => setSelectedVenueId(v.id)}
                className={`w-full text-left p-3 border-b border-border transition-colors ${
                  selectedVenueId === v.id
                    ? 'bg-muted border-l-2 border-l-primary'
                    : 'hover:bg-muted/50'
                }`}
              >
                <div className="text-xs font-medium text-foreground">{v.name}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {v.city} · {v.venueType}
                  {homeBase && (() => {
                    const km = roadDistances[v.id];
                    if (km !== undefined) {
                      return <span className="text-primary ml-1">· {km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`}</span>;
                    }
                    const straight = distanceKm(homeBase.lat, homeBase.lng, v.lat, v.lng);
                    return <span className="text-primary/60 ml-1">· ~{straight.toFixed(1)}km</span>;
                  })()}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {venuePhotos.length} fotos · {venueEvents.length} eventos
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-border flex gap-2">
        <button
          onClick={handleExport}
          className="flex-1 flex items-center justify-center gap-1.5 text-[10px] uppercase tracking-wider py-1.5 border border-border text-muted-foreground hover:text-foreground transition-colors"
        >
          <Download className="w-3 h-3" />
          Exportar
        </button>
        <label className="flex-1 flex items-center justify-center gap-1.5 text-[10px] uppercase tracking-wider py-1.5 border border-border text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
          <Upload className="w-3 h-3" />
          {importing ? 'Importando...' : 'Importar'}
          <input type="file" accept=".json" onChange={handleImport} className="hidden" />
        </label>
      </div>
    </div>
  );
}
