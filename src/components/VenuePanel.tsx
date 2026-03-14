import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { X, Plus, Trash2, Camera, Calendar, Tag, Wrench, Sparkles, Video, Play, Loader2, Pin } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { useMediaUrls } from '@/hooks/use-media-url';
import {
  type Venue, type VenuePhoto, type VenueEvent, type PhotoCategory,
  getPhotosByVenue, getEventsByVenue,
  addPhoto, deletePhoto, addEvent, deleteEvent, deleteVenue, updateVenue,
  VENUE_TYPES, EVENT_TYPES, PHOTO_TAGS,
} from '@/lib/db';
import { needsConversion, convertToMp4 } from '@/lib/video-converter';
import { extractVideoThumbnail } from '@/lib/video-thumbnail';
import { getPinnedPhotos, togglePinPhoto, type PinnedPhoto } from '@/lib/store';
import { Progress } from '@/components/ui/progress';
import { motion, AnimatePresence } from 'framer-motion';

export default function VenuePanel() {
  const { selectedVenueId, setSelectedVenueId, venues, refresh, openFullscreen } = useApp();
  const venue = venues.find(v => v.id === selectedVenueId);
  const [photos, setPhotos] = useState<VenuePhoto[]>([]);
  const [events, setEvents] = useState<VenueEvent[]>([]);
  const [tab, setTab] = useState<'evento' | 'estrutura' | 'events' | 'info'>('evento');
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<Venue | null>(null);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const fileRefEvento = useRef<HTMLInputElement>(null);
  const fileRefEstrutura = useRef<HTMLInputElement>(null);
  const [converting, setConverting] = useState(false);
  const [convertProgress, setConvertProgress] = useState(0);

  useEffect(() => {
    if (!venue) return;
    Promise.all([getPhotosByVenue(venue.id), getEventsByVenue(venue.id)]).then(([p, e]) => {
      setPhotos(p);
      setEvents(e);
    });
  }, [venue, selectedVenueId]);

  if (!venue) return null;

  const eventPhotos = photos.filter(p => p.category === 'evento' || !p.category);
  const structurePhotos = photos.filter(p => p.category === 'estrutura');
  const mediaUrls = useMediaUrls(photos);

  const refreshLocal = async () => {
    const [p, e] = await Promise.all([getPhotosByVenue(venue.id), getEventsByVenue(venue.id)]);
    setPhotos(p);
    setEvents(e);
    await refresh();
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, category: PhotoCategory) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      const isVideo = file.type.startsWith('video/') || file.name.toLowerCase().endsWith('.mov');
      
      if (isVideo) {
        let blob: Blob = file;
        let mimeType = file.type || 'video/mp4';

        // Convert MOV / incompatible formats to MP4
        if (needsConversion(file)) {
          try {
            setConverting(true);
            setConvertProgress(0);
            blob = await convertToMp4(file, (ratio) => setConvertProgress(Math.round(ratio * 100)));
            mimeType = 'video/mp4';
          } catch (err) {
            console.error('Conversion failed, storing original:', err);
            // Fallback: store original
          } finally {
            setConverting(false);
            setConvertProgress(0);
          }
        }

        // Extract thumbnail
        let thumbnail = '';
        try {
          thumbnail = await extractVideoThumbnail(blob);
        } catch (err) {
          console.warn('Thumbnail extraction failed:', err);
        }

        await addPhoto({
          venueId: venue.id,
          data: '',
          caption: '',
          tags: [],
          category,
          mediaType: 'video',
          blob,
          mimeType,
          thumbnail,
        });
        await refreshLocal();
      } else {
        // Photos: keep base64 (they're small)
        const reader = new FileReader();
        reader.onload = async (ev) => {
          const data = ev.target?.result as string;
          await addPhoto({
            venueId: venue.id,
            data,
            caption: '',
            tags: [],
            category,
            mediaType: 'photo',
          });
          await refreshLocal();
        };
        reader.readAsDataURL(file);
      }
    }
    e.target.value = '';
  };

  const handleDeleteVenue = async () => {
    if (!confirm('Excluir este local e todos os dados?')) return;
    await deleteVenue(venue.id);
    setSelectedVenueId(null);
    await refresh();
  };

  const handleSaveEdit = async () => {
    if (!editData) return;
    await updateVenue(editData);
    setEditing(false);
    await refresh();
  };

  const renderPhotoGrid = (photoList: VenuePhoto[], category: PhotoCategory, fileRef: React.RefObject<HTMLInputElement | null>, mediaUrls: Record<string, string>) => (
    <div className="p-3">
      <button
        onClick={() => fileRef.current?.click()}
        className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary text-[10px] uppercase tracking-wider transition-colors mb-3"
      >
        <Camera className="w-3.5 h-3.5" />
        {category === 'evento' ? 'Adicionar Fotos/Vídeos do Evento' : 'Adicionar Fotos/Vídeos da Estrutura'}
      </button>
      <input ref={fileRef} type="file" accept="image/*,video/*" multiple onChange={e => handlePhotoUpload(e, category)} className="hidden" />

      {category === 'estrutura' && (
        <div className="mb-3 p-2 border border-gold-dim/30 bg-muted/50">
          <p className="text-[10px] text-muted-foreground font-body leading-relaxed">
            <Wrench className="w-3 h-3 inline mr-1 text-primary" />
            Fotos da estrutura montada <strong className="text-foreground">sem iluminação</strong> — para a equipe visualizar como ficou a montagem e ter referências.
          </p>
        </div>
      )}

      {photoList.length === 0 ? (
        <p className="text-center text-xs text-muted-foreground py-8 font-body">
          {category === 'evento' ? 'Nenhuma foto do evento' : 'Nenhuma foto da estrutura'}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-1">
          {photoList.map((p, i) => (
            <div key={p.id} className="relative group aspect-square overflow-hidden bg-muted cursor-pointer" onClick={() => openFullscreen(photoList, i)}>
              {p.mediaType === 'video' ? (
                <>
                  {p.thumbnail ? (
                    <img src={p.thumbnail} alt="Video thumbnail" className="w-full h-full object-cover" />
                  ) : (
                    <video className="w-full h-full object-cover" muted preload="metadata">
                      <source src={mediaUrls[p.id] || p.data} type={p.mimeType || 'video/mp4'} />
                    </video>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-10 h-10 rounded-full bg-primary/80 flex items-center justify-center">
                      <Play className="w-5 h-5 text-primary-foreground ml-0.5" />
                    </div>
                  </div>
                </>
              ) : (
                <img src={mediaUrls[p.id] || p.data} alt={p.caption || 'Foto'} className="w-full h-full object-cover" />
              )}
              <div className="absolute inset-0 bg-nocturne/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-1.5">
                {p.tags.length > 0 && (
                  <div className="flex flex-wrap gap-0.5">
                    {p.tags.map(t => (
                      <span key={t} className="text-[8px] bg-primary/30 text-primary-foreground px-1 py-0.5">
                        {PHOTO_TAGS.find(pt => pt.id === t)?.label || t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={async (ev) => { ev.stopPropagation(); await deletePhoto(p.id); await refreshLocal(); }}
                className="absolute top-1 right-1 w-5 h-5 bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const tabs = [
    { key: 'evento' as const, label: `Evento (${eventPhotos.length})`, icon: Sparkles },
    { key: 'estrutura' as const, label: `Estrutura (${structurePhotos.length})`, icon: Wrench },
    { key: 'events' as const, label: `Registros (${events.length})`, icon: Calendar },
    { key: 'info' as const, label: 'Info', icon: Tag },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'tween', duration: 0.3 }}
        className="absolute right-0 top-0 h-full w-[400px] bg-card border-l border-border z-[1000] flex flex-col overflow-hidden"
      >
        {/* Conversion overlay */}
        {converting && (
          <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm font-medium text-foreground">Convertendo vídeo para MP4…</p>
            <Progress value={convertProgress} className="w-48 h-2" />
            <p className="text-xs text-muted-foreground">{convertProgress}%</p>
          </div>
        )}

        {/* Header */}
        <div className="p-4 border-b border-border flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-foreground truncate">{venue.name}</h2>
            <p className="text-[10px] text-muted-foreground mt-0.5">{venue.city} · {venue.venueType}</p>
          </div>
          <button onClick={() => setSelectedVenueId(null)} className="text-muted-foreground hover:text-foreground ml-2 mt-0.5">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 text-[9px] uppercase tracking-widest py-2.5 transition-colors flex items-center justify-center gap-1 ${
                tab === t.key ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <t.icon className="w-3 h-3" />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {tab === 'evento' && renderPhotoGrid(eventPhotos, 'evento', fileRefEvento, mediaUrls)}
          {tab === 'estrutura' && renderPhotoGrid(structurePhotos, 'estrutura', fileRefEstrutura, mediaUrls)}

          {tab === 'events' && (
            <div className="p-3">
              <button
                onClick={() => setShowAddEvent(true)}
                className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary text-[10px] uppercase tracking-wider transition-colors mb-3"
              >
                <Plus className="w-3.5 h-3.5" />
                Novo Evento
              </button>

              {showAddEvent && (
                <AddEventForm
                  venueId={venue.id}
                  onClose={() => setShowAddEvent(false)}
                  onSave={refreshLocal}
                />
              )}

              {events.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-8 font-body">Nenhum evento registrado</p>
              ) : (
                <div className="space-y-2">
                  {events.map(ev => (
                    <div key={ev.id} className="border border-border p-3 group">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-xs font-medium text-foreground">{ev.name}</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-2">
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{ev.date}</span>
                            <span className="flex items-center gap-1"><Tag className="w-3 h-3" />{ev.eventType}</span>
                          </div>
                          {ev.notes && <p className="text-[10px] text-muted-foreground mt-1 font-body">{ev.notes}</p>}
                        </div>
                        <button
                          onClick={async () => { await deleteEvent(ev.id); await refreshLocal(); }}
                          className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'info' && (
            <div className="p-3">
              {editing && editData ? (
                <div className="space-y-3">
                  <Field label="Nome" value={editData.name} onChange={v => setEditData({...editData, name: v})} />
                  <Field label="Cidade" value={editData.city} onChange={v => setEditData({...editData, city: v})} />
                  <Field label="Endereço" value={editData.address} onChange={v => setEditData({...editData, address: v})} />
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 block">Tipo</label>
                    <select
                      value={editData.venueType}
                      onChange={e => setEditData({...editData, venueType: e.target.value})}
                      className="w-full bg-muted text-foreground text-xs px-3 py-2 border border-border focus:outline-none focus:border-primary"
                    >
                      {VENUE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <Field label="Capacidade" value={editData.capacity} onChange={v => setEditData({...editData, capacity: v})} />
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 block">Notas</label>
                    <textarea
                      value={editData.notes}
                      onChange={e => setEditData({...editData, notes: e.target.value})}
                      className="w-full bg-muted text-foreground text-xs px-3 py-2 border border-border focus:outline-none focus:border-primary h-20 resize-none font-body"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleSaveEdit} className="flex-1 bg-primary text-primary-foreground text-[10px] uppercase tracking-wider py-2">Salvar</button>
                    <button onClick={() => setEditing(false)} className="flex-1 border border-border text-muted-foreground text-[10px] uppercase tracking-wider py-2">Cancelar</button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <InfoRow label="Endereço" value={venue.address || '—'} />
                  <InfoRow label="Tipo" value={venue.venueType} />
                  <InfoRow label="Capacidade" value={venue.capacity || '—'} />
                  <InfoRow label="Coordenadas" value={`${venue.lat.toFixed(4)}, ${venue.lng.toFixed(4)}`} />
                  {venue.notes && (
                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 block">Notas</label>
                      <p className="text-xs text-foreground font-body">{venue.notes}</p>
                    </div>
                  )}
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => { setEditing(true); setEditData({...venue}); }}
                      className="flex-1 border border-border text-muted-foreground hover:text-foreground text-[10px] uppercase tracking-wider py-2 transition-colors"
                    >
                      Editar
                    </button>
                    <button
                      onClick={handleDeleteVenue}
                      className="flex-1 border border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground text-[10px] uppercase tracking-wider py-2 transition-colors"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 block">{label}</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-muted text-foreground text-xs px-3 py-2 border border-border focus:outline-none focus:border-primary"
      />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5 block">{label}</label>
      <p className="text-xs text-foreground">{value}</p>
    </div>
  );
}

function AddEventForm({ venueId, onClose, onSave }: { venueId: string; onClose: () => void; onSave: () => void }) {
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [eventType, setEventType] = useState<string>(EVENT_TYPES[0]);
  const [clientType, setClientType] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = async () => {
    if (!name || !date) return;
    await addEvent({ venueId, name, date, eventType, clientType, notes });
    onSave();
    onClose();
  };

  return (
    <div className="border border-primary/30 p-3 mb-3 space-y-2">
      <Field label="Nome do Evento" value={name} onChange={setName} />
      <div>
        <label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 block">Data</label>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className="w-full bg-muted text-foreground text-xs px-3 py-2 border border-border focus:outline-none focus:border-primary" />
      </div>
      <div>
        <label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 block">Tipo de Evento</label>
        <select value={eventType} onChange={e => setEventType(e.target.value)}
          className="w-full bg-muted text-foreground text-xs px-3 py-2 border border-border focus:outline-none focus:border-primary">
          {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <Field label="Tipo de Cliente" value={clientType} onChange={setClientType} />
      <div>
        <label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 block">Notas</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)}
          className="w-full bg-muted text-foreground text-xs px-3 py-2 border border-border focus:outline-none focus:border-primary h-16 resize-none font-body" />
      </div>
      <div className="flex gap-2">
        <button onClick={handleSubmit} className="flex-1 bg-primary text-primary-foreground text-[10px] uppercase tracking-wider py-2">Salvar</button>
        <button onClick={onClose} className="flex-1 border border-border text-muted-foreground text-[10px] uppercase tracking-wider py-2">Cancelar</button>
      </div>
    </div>
  );
}
