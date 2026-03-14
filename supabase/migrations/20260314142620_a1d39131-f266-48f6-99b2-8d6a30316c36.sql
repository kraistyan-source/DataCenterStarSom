
-- Venues table
CREATE TABLE public.venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  venue_type TEXT NOT NULL DEFAULT 'Outro',
  capacity TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Events table
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID REFERENCES public.venues(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  date TEXT NOT NULL DEFAULT '',
  event_type TEXT NOT NULL DEFAULT '',
  client_type TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Photos metadata table (media files stored in storage bucket)
CREATE TABLE public.photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID REFERENCES public.venues(id) ON DELETE CASCADE NOT NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  category TEXT NOT NULL DEFAULT 'evento',
  media_type TEXT NOT NULL DEFAULT 'photo',
  mime_type TEXT,
  caption TEXT NOT NULL DEFAULT '',
  tags TEXT[] NOT NULL DEFAULT '{}',
  storage_path TEXT,
  thumbnail_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Storage bucket for media files
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true);

-- RLS: Public read access (no auth required for this app)
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read venues" ON public.venues FOR SELECT USING (true);
CREATE POLICY "Public insert venues" ON public.venues FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update venues" ON public.venues FOR UPDATE USING (true);
CREATE POLICY "Public delete venues" ON public.venues FOR DELETE USING (true);

CREATE POLICY "Public read events" ON public.events FOR SELECT USING (true);
CREATE POLICY "Public insert events" ON public.events FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update events" ON public.events FOR UPDATE USING (true);
CREATE POLICY "Public delete events" ON public.events FOR DELETE USING (true);

CREATE POLICY "Public read photos" ON public.photos FOR SELECT USING (true);
CREATE POLICY "Public insert photos" ON public.photos FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update photos" ON public.photos FOR UPDATE USING (true);
CREATE POLICY "Public delete photos" ON public.photos FOR DELETE USING (true);

-- Storage policies
CREATE POLICY "Public read media" ON storage.objects FOR SELECT USING (bucket_id = 'media');
CREATE POLICY "Public insert media" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'media');
CREATE POLICY "Public delete media" ON storage.objects FOR DELETE USING (bucket_id = 'media');
