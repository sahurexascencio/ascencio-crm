-- ============================================================
-- Ascencio CRM — Schema additions v1.1
-- Append these to the bottom of schema.sql
-- Then run in Supabase SQL editor
-- ============================================================

-- ── Add tags and follow_up_count to leads ────────────────────

alter table leads add column if not exists tags text[] default '{}';
alter table leads add column if not exists follow_up_count integer default 0;
alter table leads add column if not exists treatment text;
alter table leads add column if not exists assigned_name text;

-- ── Tasks ─────────────────────────────────────────────────────

create table if not exists tasks (
    id uuid primary key default gen_random_uuid(),
    lead_id uuid not null references leads(id) on delete cascade,
    created_by uuid not null references users(id) on delete restrict,
    assigned_to uuid references users(id) on delete set null,
    title text not null,
    notes text,
    due_date timestamptz,
    completed boolean not null default false,
    completed_at timestamptz,
    created_at timestamptz not null default now()
);

create index tasks_lead_idx on tasks(lead_id);
create index tasks_assigned_idx on tasks(assigned_to);
create index tasks_due_idx on tasks(due_date);

-- ── Templates ─────────────────────────────────────────────────

create type template_type as enum ('sms', 'email', 'whatsapp');

create table if not exists templates (
    id uuid primary key default gen_random_uuid(),
    created_by uuid not null references users(id) on delete restrict,
    name text not null,
    type template_type not null,
    subject text,
    body text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- ── Services (treatment prices per lead/clinic) ───────────────

create table if not exists services (
    id uuid primary key default gen_random_uuid(),
    lead_id uuid not null references leads(id) on delete cascade,
    name text not null,
    price numeric(10,2),
    currency text not null default 'GBP',
    notes text,
    created_at timestamptz not null default now()
);

create index services_lead_idx on services(lead_id);

-- ── SMS log ───────────────────────────────────────────────────

create table if not exists messages (
    id uuid primary key default gen_random_uuid(),
    lead_id uuid not null references leads(id) on delete cascade,
    contact_id uuid references contacts(id) on delete set null,
    sent_by uuid references users(id) on delete set null,
    direction text not null default 'outbound',
    body text not null,
    twilio_message_sid text,
    status text,
    created_at timestamptz not null default now()
);

create index messages_lead_idx on messages(lead_id);
