-- Run in Supabase Dashboard > SQL Editor to verify Security Advisor fixes.
-- Expected result for all rows: search_path = public, pg_temp

SELECT
  n.nspname AS schema_name,
  p.proname AS function_name,
  COALESCE(
    array_to_string(p.proconfig, ', '),
    'NOT SET'
  ) AS function_config,
  CASE
    WHEN p.proconfig @> ARRAY['search_path=public, pg_temp'] THEN 'OK'
    ELSE 'MISSING'
  END AS search_path_status
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'check_order_overlap',
    'check_pixel_overlap',
    'check_pixel_bounds'
  )
ORDER BY p.proname;
