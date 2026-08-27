-- Campos de HD instalado em DVRs.
-- Execute esta migração no Supabase antes de usar os novos campos no app.

ALTER TABLE public.dvrs
  ADD COLUMN IF NOT EXISTS hd_capacity_tb NUMERIC,
  ADD COLUMN IF NOT EXISTS hd_brand TEXT,
  ADD COLUMN IF NOT EXISTS hd_model TEXT;
