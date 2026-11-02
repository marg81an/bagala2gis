-- Bagala: выполните этот скрипт в Supabase → SQL Editor → New query → Run

create extension if not exists pgcrypto;

create table if not exists venues (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  logo_url text,
  gis_url text,
  google_url text,
  owner_token text not null unique,
  tg_link_code text not null unique,
  tg_chat_id bigint,
  owner_lang text not null default 'ru',
  threshold smallint not null default 4 check (threshold between 2 and 5),
  notify_all boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references venues(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text,
  contact text,
  staff text,
  lang text,
  clicked text,
  created_at timestamptz not null default now()
);

create index if not exists reviews_venue_created_idx on reviews (venue_id, created_at desc);
create index if not exists venues_tg_chat_idx on venues (tg_chat_id);

-- Закрываем таблицы от публичного доступа. Сервер работает через секретный ключ, он обходит RLS.
alter table venues enable row level security;
alter table reviews enable row level security;
