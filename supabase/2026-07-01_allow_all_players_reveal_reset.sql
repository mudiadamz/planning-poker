-- =====================================================================
-- Allow ANY seated player (not just the owner) to reveal cards and to
-- start a new voting round.
--
-- Run this once in the Supabase SQL Editor for the deployed (pp_-prefixed)
-- project. It only redefines the two RPCs; tables, policies, grants and the
-- owner-only RPCs (kick / transfer / deck) are unchanged. Ownership still
-- exists and still gates seat management — this change only affects
-- reveal + reset.
--
-- Safety: we drop the owner check but keep a MEMBERSHIP check, so a random
-- anon who merely knows the room id still cannot flip room state; the caller
-- must be a player currently seated in that room.
-- =====================================================================

create or replace function public.pp_reveal_room(
  p_room_id   text,
  p_player_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.pp_players
     where room_id = p_room_id and id = p_player_id
  ) then
    raise exception 'Only players in this room can reveal cards'
      using errcode = '42501';
  end if;
  update public.pp_rooms set revealed = true where id = p_room_id;
end;
$$;

create or replace function public.pp_reset_room(
  p_room_id   text,
  p_player_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room        public.pp_rooms%rowtype;
  v_votes       jsonb;
  v_vote_count  integer;
  v_average     numeric;
begin
  if not exists (
    select 1 from public.pp_players
     where room_id = p_room_id and id = p_player_id
  ) then
    raise exception 'Only players in this room can reset votes'
      using errcode = '42501';
  end if;

  select * into v_room from public.pp_rooms where id = p_room_id;
  if not found then
    raise exception 'Room not found';
  end if;

  -- Only snapshot to history when the round was actually revealed.
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
    from public.pp_players p
    where p.room_id = p_room_id;

    if v_vote_count > 0 then
      insert into public.pp_voting_rounds
        (room_id, room_name, deck, votes, vote_count, average)
      values
        (p_room_id, v_room.name, v_room.deck, v_votes, v_vote_count, v_average);
    end if;
  end if;

  update public.pp_players set vote = null    where room_id = p_room_id;
  update public.pp_rooms   set revealed = false where id     = p_room_id;
end;
$$;

-- Grants are unchanged from the originals, re-stated here so the file is
-- self-contained if run against a fresh copy.
grant execute on function public.pp_reveal_room(text, uuid) to anon, authenticated;
grant execute on function public.pp_reset_room(text, uuid)  to anon, authenticated;
