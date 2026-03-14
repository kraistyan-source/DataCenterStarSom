-- Add user_id to venues
ALTER TABLE public.venues ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to events  
ALTER TABLE public.events ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to photos
ALTER TABLE public.photos ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop old public policies on venues
DROP POLICY IF EXISTS "Public delete venues" ON public.venues;
DROP POLICY IF EXISTS "Public insert venues" ON public.venues;
DROP POLICY IF EXISTS "Public read venues" ON public.venues;
DROP POLICY IF EXISTS "Public update venues" ON public.venues;

-- Drop old public policies on events
DROP POLICY IF EXISTS "Public delete events" ON public.events;
DROP POLICY IF EXISTS "Public insert events" ON public.events;
DROP POLICY IF EXISTS "Public read events" ON public.events;
DROP POLICY IF EXISTS "Public update events" ON public.events;

-- Drop old public policies on photos
DROP POLICY IF EXISTS "Public delete photos" ON public.photos;
DROP POLICY IF EXISTS "Public insert photos" ON public.photos;
DROP POLICY IF EXISTS "Public read photos" ON public.photos;
DROP POLICY IF EXISTS "Public update photos" ON public.photos;

-- Venues RLS - user scoped
CREATE POLICY "Users read own venues" ON public.venues FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users insert own venues" ON public.venues FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own venues" ON public.venues FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users delete own venues" ON public.venues FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Events RLS - user scoped
CREATE POLICY "Users read own events" ON public.events FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users insert own events" ON public.events FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own events" ON public.events FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users delete own events" ON public.events FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Photos RLS - user scoped
CREATE POLICY "Users read own photos" ON public.photos FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users insert own photos" ON public.photos FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own photos" ON public.photos FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users delete own photos" ON public.photos FOR DELETE TO authenticated USING (user_id = auth.uid());