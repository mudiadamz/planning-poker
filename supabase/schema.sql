-- =====================================================================
-- Planning Poker schema for Supabase
-- Run this once in Supabase SQL Editor (or via supabase CLI).
-- =====================================================================

-- Rooms hold deck configuration and reveal state.
create table if not exists public.rooms (
  id          text primary key,
  name        text,
  deck        jsonb       not null default '["1","2","3","5","8","13","?"]'::jsonb,
  revealed    boolean     not null default false,
  created_at  timestamptz not null default now()
);

-- Players belong to a room. `vote` is null until they pick a card.
create table if not exists public.players (
  id         uuid        primary key default gen_random_uuid(),
  room_id    text        not null references public.rooms(id) on delete cascade,
  name       text        not null,
  vote       text,
  last_seen  timestamptz not null default now(),
  joined_at  timestamptz not null default now()
);

create index if not exists players_room_id_idx on public.players (room_id);
create index if not exists players_last_seen_idx on public.players (last_seen);

-- Voting history: one row per completed voting round (snapshot at reset).
create table if not exists public.voting_rounds (
  id           uuid        primary key default gen_random_uuid(),
  room_id      text        not null references public.rooms(id) on delete cascade,
  room_name    text,
  deck         jsonb       not null,
  -- Array of { player_id, name, vote }
  votes        jsonb       not null default '[]'::jsonb,
  vote_count   integer     not null default 0,
  average      numeric,
  created_at   timestamptz not null default now()
);

create index if not exists voting_rounds_room_id_idx     on public.voting_rounds (room_id);
create index if not exists voting_rounds_created_at_idx  on public.voting_rounds (created_at desc);

-- =====================================================================
-- Realtime: publish both tables so clients get postgres_changes events.
--
-- IMPORTANT: REPLICA IDENTITY FULL is required so DELETE events include
-- the full old row (e.g. `room_id`). Without it, postgres_changes filters
-- like `room_id=eq.<id>` cannot match deletes and clients won't see when
-- a player leaves.
-- =====================================================================
alter table public.rooms   replica identity full;
alter table public.players replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'rooms'
  ) then
    execute 'alter publication supabase_realtime add table public.rooms';
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'players'
  ) then
    execute 'alter publication supabase_realtime add table public.players';
  end if;
end $$;

-- =====================================================================
-- Row Level Security
--
-- Strategy:
--   * Anyone with the link can read rooms and create new rooms.
--   * Direct UPDATE/DELETE on rooms is forbidden — every mutation goes
--     through SECURITY DEFINER RPCs that verify the caller is the room
--     owner (= player with the earliest joined_at in that room).
--   * Players table stays open: clients need to insert themselves on join,
--     update their vote/heartbeat, and delete on leave. The "ownership"
--     concept only constrains room-level state.
-- =====================================================================
alter table public.rooms   enable row level security;
alter table public.players enable row level security;

drop policy if exists "rooms_anon_all"    on public.rooms;
drop policy if exists "rooms_select_all"  on public.rooms;
drop policy if exists "rooms_insert_all"  on public.rooms;
drop policy if exists "rooms_update_all"  on public.rooms;
drop policy if exists "rooms_delete_all"  on public.rooms;
drop policy if exists "players_anon_all"  on public.players;

create policy "rooms_select_all"
  on public.rooms
  for select
  to anon, authenticated
  using (true);

create policy "rooms_insert_all"
  on public.rooms
  for insert
  to anon, authenticated
  with check (true);

-- NOTE: There is no UPDATE/DELETE policy on public.rooms on purpose.
-- All room mutations must go through the SECURITY DEFINER functions below.

create policy "players_anon_all"
  on public.players
  for all
  to anon, authenticated
  using (true)
  with check (true);

-- =====================================================================
-- Owner-enforced RPCs
--
-- The "owner" is the player with the earliest joined_at in the room. If
-- the owner leaves (their row is deleted), the next-earliest player
-- automatically becomes owner — no extra bookkeeping needed.
-- =====================================================================

create or replace function public.is_room_owner(
  p_room_id   text,
  p_player_id uuid
)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.players
    where room_id = p_room_id
      and id      = p_player_id
      and joined_at = (
        select min(joined_at)
        from public.players
        where room_id = p_room_id
      )
  );
$$;

create or replace function public.reveal_room(
  p_room_id   text,
  p_player_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_room_owner(p_room_id, p_player_id) then
    raise exception 'Only the room owner can reveal cards'
      using errcode = '42501';
  end if;
  update public.rooms set revealed = true where id = p_room_id;
end;
$$;

create or replace function public.reset_room(
  p_room_id   text,
  p_player_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room        public.rooms%rowtype;
  v_votes       jsonb;
  v_vote_count  integer;
  v_average     numeric;
begin
  if not public.is_room_owner(p_room_id, p_player_id) then
    raise exception 'Only the room owner can reset votes'
      using errcode = '42501';
  end if;

  select * into v_room from public.rooms where id = p_room_id;
  if not found then
    raise exception 'Room not found';
  end if;

  -- Only snapshot to history when there were actually revealed votes — i.e.
  -- the round was finished. Resetting a fresh / unrevealed room is a no-op
  -- for history.
  if v_room.revealed then
    select
      coalesce(jsonb_agg(jsonb_build_object(
        'player_id', p.id,
        'name',      p.name,
        'vote',      p.vote
      ) order by p.joined_at), '[]'::jsonb),
      count(*) filter (where p.vote is not null),
      avg(
        case
          when p.vote ~ '^-?[0-9]+(\.[0-9]+)?$' then p.vote::numeric
          when p.vote ~ '^[0-9]+/[1-9][0-9]*$' then
            split_part(p.vote, '/', 1)::numeric / split_part(p.vote, '/', 2)::numeric
          else null
        end
      )
    into v_votes, v_vote_count, v_average
    from public.players p
    where p.room_id = p_room_id;

    if v_vote_count > 0 then
      insert into public.voting_rounds
        (room_id, room_name, deck, votes, vote_count, average)
      values
        (p_room_id, v_room.name, v_room.deck, v_votes, v_vote_count, v_average);
    end if;
  end if;

  update public.players set vote = null    where room_id = p_room_id;
  update public.rooms   set revealed = false where id     = p_room_id;
end;
$$;

create or replace function public.kick_player(
  p_room_id   text,
  p_owner_id  uuid,
  p_target_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_room_owner(p_room_id, p_owner_id) then
    raise exception 'Only the room owner can kick players'
      using errcode = '42501';
  end if;
  if p_owner_id = p_target_id then
    raise exception 'Owner cannot kick themselves';
  end if;
  delete from public.players
   where id = p_target_id and room_id = p_room_id;
end;
$$;

create or replace function public.update_room_deck(
  p_room_id   text,
  p_player_id uuid,
  p_deck      jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_room_owner(p_room_id, p_player_id) then
    raise exception 'Only the room owner can change the deck'
      using errcode = '42501';
  end if;
  if jsonb_typeof(p_deck) <> 'array' or jsonb_array_length(p_deck) = 0 then
    raise exception 'Deck must be a non-empty JSON array';
  end if;
  update public.rooms
     set deck = p_deck, revealed = false
   where id  = p_room_id;
  update public.players set vote = null where room_id = p_room_id;
end;
$$;

revoke all on function public.reveal_room(text, uuid)              from public;
revoke all on function public.reset_room(text, uuid)               from public;
revoke all on function public.update_room_deck(text, uuid, jsonb)  from public;
revoke all on function public.kick_player(text, uuid, uuid)        from public;

grant execute on function public.reveal_room(text, uuid)             to anon, authenticated;
grant execute on function public.reset_room(text, uuid)              to anon, authenticated;
grant execute on function public.update_room_deck(text, uuid, jsonb) to anon, authenticated;
grant execute on function public.kick_player(text, uuid, uuid)       to anon, authenticated;

-- =====================================================================
-- voting_rounds: locked down. Only the service role (used by /admin via
-- Next.js server routes) can read. Nobody can write directly — rows are
-- inserted by reset_room() which runs as SECURITY DEFINER (bypasses RLS).
-- =====================================================================
alter table public.voting_rounds enable row level security;

-- Intentionally NO policies for anon/authenticated → all direct access
-- denied. service_role bypasses RLS so the /admin server routes can read.
