-- Run this in Supabase SQL editor if messages table needs updating
alter table messages add column if not exists channel text not null default 'sms';
alter table messages add column if not exists direction text not null default 'outbound';
alter table messages add column if not exists from_address text;
alter table messages add column if not exists to_address text;
alter table messages add column if not exists twilio_sid text;
alter table messages add column if not exists status text default 'sent';
alter table messages add column if not exists subject text; -- for email
alter table messages add column if not exists read_at timestamptz;

-- Index for conversation view
create index if not exists idx_messages_lead_created on messages(lead_id, created_at desc);
