-- Migration: create production_staff table (production-only, non-app users)
create type staff_position as enum (
  'serrador',
  'acabador',
  'ajudante_serrador',
  'ajudante_acabador',
  'motorista',
  'medidor'
);

create table production_staff (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  position staff_position not null,
  hourly_rate numeric(10,2) default 0,
  phone text,
  status text default 'ativo',
  company_id uuid references companies(id),
  created_at timestamptz default now()
);

-- RLS: Only authenticated users with role admin or manager can manage production staff
alter table production_staff enable row level security;

create policy "admin_manager_select_staff" on production_staff
  for select using (auth.role() in ('admin', 'manager'));

create policy "admin_manager_insert_staff" on production_staff
  for insert with check (auth.role() in ('admin', 'manager'));

create policy "admin_manager_update_staff" on production_staff
  for update using (auth.role() in ('admin', 'manager'));

create policy "admin_delete_staff" on production_staff
  for delete using (auth.role() = 'admin');
