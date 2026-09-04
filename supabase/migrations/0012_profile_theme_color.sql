-- 0012 — per-user accent colour
-- Stores the accent KEY (not a hex), checked against the 10 presets defined in
-- src/core/theme/accents.ts. Default 'indigo' == the colours the app shipped
-- with, so existing rows render unchanged.

alter table public.profiles
  add column theme_color text not null default 'indigo';

alter table public.profiles
  add constraint profiles_theme_color_check
  check (theme_color in
    ('indigo', 'violet', 'blue', 'teal', 'emerald', 'amber', 'rose', 'red', 'graphite', 'black'));
