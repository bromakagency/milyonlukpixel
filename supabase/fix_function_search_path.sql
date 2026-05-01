-- Fix Supabase Security Advisor warnings:
-- "Function Search Path Mutable"
--
-- Run this once in Supabase Dashboard > SQL Editor.
-- It only changes function configuration and keeps the existing function bodies.

ALTER FUNCTION public.check_order_overlap() SET search_path = public, pg_temp;
ALTER FUNCTION public.check_pixel_overlap() SET search_path = public, pg_temp;
ALTER FUNCTION public.check_pixel_bounds() SET search_path = public, pg_temp;

NOTIFY pgrst, 'reload schema';
