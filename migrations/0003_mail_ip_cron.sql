-- Mailbox passwords, dedicated IPs, and scheduled jobs.

alter table mailboxes add column if not exists password_hash text not null default '';

create table if not exists ip_addresses (
  id serial primary key,
  address text not null unique,
  label text not null default '',
  created_at timestamptz not null default now()
);

alter table sites add column if not exists ip_id integer references ip_addresses(id) on delete set null;
alter table node_apps add column if not exists ip_id integer references ip_addresses(id) on delete set null;

create table if not exists cron_jobs (
  id serial primary key,
  kind text not null,
  target_id integer not null,
  name text not null default '',
  schedule text not null,
  command text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists cron_jobs_target_idx on cron_jobs (kind, target_id);
create index if not exists sites_ip_idx on sites (ip_id);
create index if not exists apps_ip_idx on node_apps (ip_id);
