-- Run this in Supabase SQL Editor after schema.sql and schema_v1_1.sql

-- Add new fields to leads
alter table leads
  add column if not exists maps_url              text,
  add column if not exists opportunity_value     numeric(10,2),
  add column if not exists opportunity_source    text,
  add column if not exists campaign_type         text,
  add column if not exists last_contacted_at     timestamptz,
  add column if not exists won_at                timestamptz,
  add column if not exists lost_at               timestamptz,
  add column if not exists address               text,
  add column if not exists notes                 text;

-- Indexes for fast filtering
create index if not exists leads_city_idx           on leads(city);
create index if not exists leads_last_contacted_idx on leads(last_contacted_at);
create index if not exists leads_created_at_idx     on leads(created_at);

-- UK cities reference table
create table if not exists uk_cities (
  id   serial primary key,
  name text unique not null
);

insert into uk_cities (name) values
  ('London'),('Manchester'),('Birmingham'),('Leeds'),('Glasgow'),
  ('Sheffield'),('Bradford'),('Liverpool'),('Edinburgh'),('Bristol'),
  ('Cardiff'),('Leicester'),('Coventry'),('Nottingham'),('Newcastle'),
  ('Southampton'),('Brighton'),('Plymouth'),('Derby'),('Stoke-on-Trent'),
  ('Wolverhampton'),('Norwich'),('Swindon'),('Swansea'),('Milton Keynes'),
  ('Bournemouth'),('Middlesbrough'),('Peterborough'),('Reading'),('Luton'),
  ('Bolton'),('Stockport'),('Oxford'),('Cambridge'),('Aberdeen'),
  ('Dundee'),('Portsmouth'),('Blackpool'),('Ipswich'),('York')
on conflict do nothing;
