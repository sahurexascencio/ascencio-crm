-- ============================================================
-- Agency CRM — Supabase Schema
-- Run this in the Supabase SQL editor to initialise the DB
-- ============================================================

create extension if not exists "pgcrypto";

-- ── Enums ────────────────────────────────────────────────────

create type user_role as enum ('admin', 'caller', 'success_manager', 'junior');
create type lead_status as enum ('new', 'in_progress', 'callback', 'confirmed', 'dead');
create type lead_industry as enum ('clinic', 'dental', 'aesthetics', 'ecommerce', 'other');
create type call_direction as enum ('inbound', 'outbound');
create type call_outcome as enum ('no_answer', 'voicemail', 'callback_scheduled', 'interested', 'confirmed', 'dead', 'in_progress');
create type booking_status as enum ('pending', 'completed', 'cancelled');

-- ── Users ────────────────────────────────────────────────────

create table users (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    email text unique not null,
    phone text,
    role user_role not null default 'caller',
    password_hash text not null,
    created_at timestamptz not null default now()
);

-- ── Leads ────────────────────────────────────────────────────

create table leads (
    id uuid primary key default gen_random_uuid(),
    business_name text not null,
    industry lead_industry not null,
    city text not null,
    country text not null default 'UK',
    website_url text,
    status lead_status not null default 'new',
    assigned_to uuid references users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index leads_status_idx on leads(status);
create index leads_assigned_idx on leads(assigned_to);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger leads_updated_at
    before update on leads
    for each row execute function update_updated_at();

-- ── Contacts ─────────────────────────────────────────────────

create table contacts (
    id uuid primary key default gen_random_uuid(),
    lead_id uuid not null references leads(id) on delete cascade,
    name text not null,
    role text,
    phone text not null,
    email text,
    is_primary boolean not null default false,
    created_at timestamptz not null default now()
);

create index contacts_lead_idx on contacts(lead_id);

-- ── Calls ─────────────────────────────────────────────────────

create table calls (
    id uuid primary key default gen_random_uuid(),
    lead_id uuid not null references leads(id) on delete cascade,
    contact_id uuid references contacts(id) on delete set null,
    caller_id uuid not null references users(id) on delete restrict,
    twilio_call_sid text unique,
    direction call_direction not null default 'outbound',
    duration_seconds integer,
    recording_url text,
    outcome call_outcome,
    notes text,
    called_at timestamptz not null default now()
);

create index calls_lead_idx on calls(lead_id);
create index calls_caller_idx on calls(caller_id);
create index calls_twilio_idx on calls(twilio_call_sid);

-- ── Lead Status History ───────────────────────────────────────

create table lead_status_history (
    id uuid primary key default gen_random_uuid(),
    lead_id uuid not null references leads(id) on delete cascade,
    from_status lead_status,
    to_status lead_status not null,
    changed_by uuid references users(id) on delete set null,
    notes text,
    changed_at timestamptz not null default now()
);

create index history_lead_idx on lead_status_history(lead_id);

-- ── Intelligence ──────────────────────────────────────────────

create table intelligence (
    id uuid primary key default gen_random_uuid(),
    lead_id uuid unique not null references leads(id) on delete cascade,
    has_website boolean,
    website_score integer,
    social_facebook_url text,
    social_instagram_url text,
    social_engagement_score integer,
    google_rating numeric(2,1),
    google_reviews_count integer,
    is_running_ads boolean,
    seo_score integer,
    raw_data jsonb,
    scraped_at timestamptz default now()
);

-- ── Bookings ──────────────────────────────────────────────────

create table bookings (
    id uuid primary key default gen_random_uuid(),
    lead_id uuid not null references leads(id) on delete restrict,
    contact_id uuid references contacts(id) on delete set null,
    confirmed_by uuid not null references users(id) on delete restrict,
    booking_date date,
    service_type text,
    booking_value numeric(10,2) not null,
    commission_rate numeric(4,3) not null default 0.200,
    commission_amount numeric(10,2) not null,
    ad_spend numeric(10,2),
    status booking_status not null default 'pending',
    notes text,
    created_at timestamptz not null default now()
);

create index bookings_lead_idx on bookings(lead_id);
create index bookings_status_idx on bookings(status);

-- ── Row Level Security ────────────────────────────────────────
-- Callers only see leads assigned to them

alter table leads enable row level security;

create policy "callers see own leads"
    on leads for select
    using (
        assigned_to::text = current_setting('app.user_id', true)
        or current_setting('app.user_role', true) in ('admin', 'success_manager')
    );

create policy "callers insert leads"
    on leads for insert
    with check (true);

create policy "callers update own leads"
    on leads for update
    using (
        assigned_to::text = current_setting('app.user_id', true)
        or current_setting('app.user_role', true) in ('admin', 'success_manager')
    );
