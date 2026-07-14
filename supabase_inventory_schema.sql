-- Inventory schema + seed data for Snack-Attack POS (Supabase/Postgres)
-- Safe to run multiple times in development.

BEGIN;

-- Ensure UUID generator is available (Supabase usually has this enabled already).
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Inventory table
CREATE TABLE IF NOT EXISTS public.inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name text NOT NULL,
  category text NOT NULL,
  current_stock numeric NOT NULL DEFAULT 0,
  unit text NOT NULL,
  minimum_stock numeric NOT NULL DEFAULT 0,
  price_per_unit numeric NOT NULL DEFAULT 0,
  status text NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_product_name_unique
ON public.inventory(product_name);

-- 2) Inventory audit log table
CREATE TABLE IF NOT EXISTS public.inventory_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.inventory(id) ON DELETE CASCADE,
  action text NOT NULL,
  quantity_changed numeric NOT NULL,
  action_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Helpful lookup indexes for logs
CREATE INDEX IF NOT EXISTS idx_inventory_logs_item_id ON public.inventory_logs(item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_created_at ON public.inventory_logs(created_at DESC);

-- 3) Enable Row Level Security
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_logs ENABLE ROW LEVEL SECURITY;

-- 4) Dev policies (full CRUD for authenticated + anon)
DROP POLICY IF EXISTS inventory_all_authenticated ON public.inventory;
CREATE POLICY inventory_all_authenticated
ON public.inventory
FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS inventory_all_anon ON public.inventory;
CREATE POLICY inventory_all_anon
ON public.inventory
FOR ALL
USING (auth.role() = 'anon')
WITH CHECK (auth.role() = 'anon');

DROP POLICY IF EXISTS inventory_logs_all_authenticated ON public.inventory_logs;
CREATE POLICY inventory_logs_all_authenticated
ON public.inventory_logs
FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS inventory_logs_all_anon ON public.inventory_logs;
CREATE POLICY inventory_logs_all_anon
ON public.inventory_logs
FOR ALL
USING (auth.role() = 'anon')
WITH CHECK (auth.role() = 'anon');

-- 5) Seed inventory data
-- Uses product_name as a natural key for upsert behavior in dev.
INSERT INTO public.inventory (
  product_name,
  category,
  current_stock,
  unit,
  minimum_stock,
  price_per_unit,
  status
)
VALUES
  ('Halo-Halo Cups', 'Others', 50, 'Cups', 20, 75, 'Good'),
  ('Hotdog', 'Frozen', 5, 'Packs', 8, 40, 'Low'),
  ('Fries', 'Frozen', 15, 'Packs', 5, 35, 'Good'),
  ('Beef Siomai', 'Frozen', 10, 'Packs', 5, 5, 'Good'),
  ('Chicken Siomai', 'Frozen', 0, 'Packs', 5, 5, 'Critical'),
  ('Burger Cheese', 'Dairy', 12, 'Pack', 10, 5, 'Good'),
  ('Eggs', 'Dairy', 30, 'Pieces', 12, 15, 'Good'),
  ('Burger Patty', 'Frozen', 0, 'Box', 2, 30, 'Critical'),
  ('Coke', 'Drinks', 2, 'Cases', 3, 20, 'Low'),
  ('Water', 'Drinks', 24, 'Pieces', 10, 25, 'Good'),
  ('16oz Cups', 'Supplies', 100, 'Cups', 50, 0, 'Good'),
  ('22oz Cups', 'Supplies', 100, 'Cups', 50, 0, 'Good')
ON CONFLICT (product_name) DO UPDATE
SET
  category = EXCLUDED.category,
  current_stock = EXCLUDED.current_stock,
  unit = EXCLUDED.unit,
  minimum_stock = EXCLUDED.minimum_stock,
  price_per_unit = EXCLUDED.price_per_unit,
  status = EXCLUDED.status;

COMMIT;
