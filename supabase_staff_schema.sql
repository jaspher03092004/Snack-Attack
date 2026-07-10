-- Create the staff table with text PIN codes to preserve leading zeros
CREATE TABLE IF NOT EXISTS public.staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  pin_code text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable row level security on the staff table
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to select, insert, update, and delete
CREATE POLICY staff_select_authenticated ON public.staff
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY staff_insert_authenticated ON public.staff
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY staff_update_authenticated ON public.staff
  FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY staff_delete_authenticated ON public.staff
  FOR DELETE USING (auth.role() = 'authenticated');

-- Allow anon role to select, insert, update, and delete (dev-friendly)
CREATE POLICY staff_select_anon ON public.staff
  FOR SELECT USING (auth.role() = 'anon');

CREATE POLICY staff_insert_anon ON public.staff
  FOR INSERT WITH CHECK (auth.role() = 'anon');

CREATE POLICY staff_update_anon ON public.staff
  FOR UPDATE USING (auth.role() = 'anon') WITH CHECK (auth.role() = 'anon');

CREATE POLICY staff_delete_anon ON public.staff
  FOR DELETE USING (auth.role() = 'anon');
