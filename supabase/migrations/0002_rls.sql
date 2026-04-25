-- SWARM v3 — RLS: brand-owner-only.
-- A user only sees rows for brands where owner_id = auth.uid().

alter table public.profiles         enable row level security;
alter table public.brands           enable row level security;
alter table public.topics           enable row level security;
alter table public.visibility_runs  enable row level security;
alter table public.context_chunks   enable row level security;
alter table public.agent_runs       enable row level security;
alter table public.tasks            enable row level security;
alter table public.drafts           enable row level security;

-- Helper: is the current user the owner of the given brand?
create or replace function public.is_brand_owner(p_brand uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.brands b
    where b.id = p_brand and b.owner_id = auth.uid()
  );
$$;

-- profiles: a user can see/manage only their own profile row.
drop policy if exists profiles_self_select on public.profiles;
create policy profiles_self_select on public.profiles
  for select using (id = auth.uid());

drop policy if exists profiles_self_upsert on public.profiles;
create policy profiles_self_upsert on public.profiles
  for insert with check (id = auth.uid());

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- brands: owner-scoped on every operation.
drop policy if exists brands_owner_select on public.brands;
create policy brands_owner_select on public.brands
  for select using (owner_id = auth.uid());

drop policy if exists brands_owner_insert on public.brands;
create policy brands_owner_insert on public.brands
  for insert with check (owner_id = auth.uid());

drop policy if exists brands_owner_update on public.brands;
create policy brands_owner_update on public.brands
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists brands_owner_delete on public.brands;
create policy brands_owner_delete on public.brands
  for delete using (owner_id = auth.uid());

-- Per-brand child tables: gated through is_brand_owner().
do $$
declare
  t text;
  child_tables text[] := array[
    'topics','visibility_runs','context_chunks','agent_runs','tasks'
  ];
begin
  foreach t in array child_tables loop
    execute format('drop policy if exists %I_brand_select on public.%I', t, t);
    execute format(
      'create policy %I_brand_select on public.%I for select using (public.is_brand_owner(brand_id))',
      t, t
    );
    execute format('drop policy if exists %I_brand_insert on public.%I', t, t);
    execute format(
      'create policy %I_brand_insert on public.%I for insert with check (public.is_brand_owner(brand_id))',
      t, t
    );
    execute format('drop policy if exists %I_brand_update on public.%I', t, t);
    execute format(
      'create policy %I_brand_update on public.%I for update using (public.is_brand_owner(brand_id)) with check (public.is_brand_owner(brand_id))',
      t, t
    );
    execute format('drop policy if exists %I_brand_delete on public.%I', t, t);
    execute format(
      'create policy %I_brand_delete on public.%I for delete using (public.is_brand_owner(brand_id))',
      t, t
    );
  end loop;
end $$;

-- drafts are joined to brand via tasks.
drop policy if exists drafts_brand_select on public.drafts;
create policy drafts_brand_select on public.drafts
  for select using (
    exists (
      select 1 from public.tasks t
      where t.id = drafts.task_id and public.is_brand_owner(t.brand_id)
    )
  );

drop policy if exists drafts_brand_insert on public.drafts;
create policy drafts_brand_insert on public.drafts
  for insert with check (
    exists (
      select 1 from public.tasks t
      where t.id = drafts.task_id and public.is_brand_owner(t.brand_id)
    )
  );

drop policy if exists drafts_brand_update on public.drafts;
create policy drafts_brand_update on public.drafts
  for update using (
    exists (
      select 1 from public.tasks t
      where t.id = drafts.task_id and public.is_brand_owner(t.brand_id)
    )
  ) with check (
    exists (
      select 1 from public.tasks t
      where t.id = drafts.task_id and public.is_brand_owner(t.brand_id)
    )
  );

drop policy if exists drafts_brand_delete on public.drafts;
create policy drafts_brand_delete on public.drafts
  for delete using (
    exists (
      select 1 from public.tasks t
      where t.id = drafts.task_id and public.is_brand_owner(t.brand_id)
    )
  );
