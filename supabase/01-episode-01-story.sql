-- =========================================================================
-- Life in LA · Season 1 · Episode 1 "Arrival" — database update
-- -------------------------------------------------------------------------
-- SAFE / NON-DESTRUCTIVE: adds one nullable column and makes sure Row Level
-- Security is on. It does not drop, rename or rewrite anything, and it can
-- be run more than once.
--
-- How to apply: Supabase dashboard → SQL Editor → New query → paste → Run.
--
-- What the new column holds (jsonb `story`):
--   episodes.ep1  — current scene/node, completed scenes, choices, flags,
--                   answers, final mission result, completed yes/no
--   world         — phrases learned, backpack items, achievements, memories,
--                   map locations, people met, story timeline
-- Journal and chat stay in their existing columns, untouched.
-- =========================================================================

alter table public.life_in_la_progress
  add column if not exists story jsonb;

comment on column public.life_in_la_progress.story is
  'Life in LA episode progress + persistent world state (written by episodes/episode-01/episode-01.js)';

-- Each student may only read and write their own row.
alter table public.life_in_la_progress enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies
                 where schemaname = 'public' and tablename = 'life_in_la_progress'
                   and policyname = 'lila_progress_select_own') then
    create policy lila_progress_select_own on public.life_in_la_progress
      for select to authenticated
      using (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies
                 where schemaname = 'public' and tablename = 'life_in_la_progress'
                   and policyname = 'lila_progress_insert_own') then
    create policy lila_progress_insert_own on public.life_in_la_progress
      for insert to authenticated
      with check (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies
                 where schemaname = 'public' and tablename = 'life_in_la_progress'
                   and policyname = 'lila_progress_update_own') then
    create policy lila_progress_update_own on public.life_in_la_progress
      for update to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

-- Optional check — list the policies now on the table:
-- select policyname, cmd, roles, qual, with_check
--   from pg_policies where tablename = 'life_in_la_progress';
--
-- Note: if you already had broader policies on this table (for example one
-- that lets any signed-in user read every row), remove those — Postgres
-- combines policies with OR, so the broadest one wins.
