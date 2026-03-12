-- Migration: create users table with role enum
create type user_role as enum ('admin', 'manager', 'seller');

create table users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text unique not null,
  password_hash text not null,
  role user_role not null,
  company_id uuid references companies(id)
);

-- RLS policies (example)
create policy "allow select for admin" on users for select using (auth.role() = 'admin');
create policy "allow insert for admin" on users for insert with check (auth.role() = 'admin');
create policy "allow update for admin" on users for update using (auth.role() = 'admin');
