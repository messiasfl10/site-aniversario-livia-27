-- ============================================================
-- Fix ambiguous parameter names in guest gift RPCs
-- ============================================================

begin;

create or replace function public.reserve_gift(
  target_gift_id uuid,
  reservation_message text default null
)
returns setof public.gifts
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_guest uuid;
  current_guest_name text;
begin
  current_guest := public.current_guest_id();

  if current_guest is null then
    raise exception 'Unauthorized';
  end if;

  select name
  into current_guest_name
  from public.guests
  where id = current_guest
    and active is true;

  if not found then
    return;
  end if;

  return query
  update public.gifts
  set
    status = 'Reservado',
    reserved_guest_id = current_guest,
    reserved_name = current_guest_name,
    reservation_message = left(coalesce($2, ''), 2000),
    reserved_at = timezone('utc'::text, now()),
    payment_status = 'Pendente',
    payment_reported_at = null,
    selected_purchase_method = null,
    selected_purchase_details = null
  where id = target_gift_id
    and coalesce(gift_type, 'single') <> 'quota'
    and reserved_guest_id is null
    and status = 'Disponível'
  returning *;
end;
$$;

revoke all on function public.reserve_gift(uuid, text) from public, anon;
grant execute on function public.reserve_gift(uuid, text) to authenticated;

create or replace function public.set_gift_purchase_method(
  target_gift_id uuid,
  purchase_method text,
  purchase_details jsonb default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_guest uuid;
  gift_record public.gifts%rowtype;
  safe_purchase_details jsonb;
  updated_count integer;
begin
  current_guest := public.current_guest_id();

  if current_guest is null
    or $2 not in ('pix', 'card', 'online', 'physical') then
    return false;
  end if;

  select *
  into gift_record
  from public.gifts
  where id = target_gift_id
    and reserved_guest_id = current_guest
    and coalesce(gift_type, 'single') <> 'quota'
  for update;

  if not found then
    return false;
  end if;

  if $2 = 'pix' then
    safe_purchase_details := jsonb_build_object('type', 'pix');
  elsif $2 = 'card' then
    if nullif(gift_record.card_payment_url, '') is null then
      return false;
    end if;

    safe_purchase_details := jsonb_build_object(
      'type',
      'card',
      'url',
      gift_record.card_payment_url
    );
  elsif $3 is null then
    safe_purchase_details := null;
  elsif not exists (
    select 1
    from jsonb_array_elements(
      case
        when jsonb_typeof(gift_record.external_purchase_options) = 'array'
          then gift_record.external_purchase_options
        else '[]'::jsonb
      end
    ) as option
    where option = $3
      and option->>'type' = $2
  ) then
    return false;
  else
    safe_purchase_details := $3;
  end if;

  update public.gifts
  set
    selected_purchase_method = $2,
    selected_purchase_details = safe_purchase_details
  where id = target_gift_id
    and reserved_guest_id = current_guest
    and coalesce(gift_type, 'single') <> 'quota';

  get diagnostics updated_count = row_count;
  return updated_count = 1;
end;
$$;

revoke all on function public.set_gift_purchase_method(uuid, text, jsonb)
  from public, anon;
grant execute on function public.set_gift_purchase_method(uuid, text, jsonb)
  to authenticated;

commit;
