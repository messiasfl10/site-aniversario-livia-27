-- Execute uma vez no SQL Editor após add_secure_invite_generation.sql.
-- Centraliza as mutações administrativas e remove escrita direta nas tabelas.

create or replace function public.update_guest_details(target_guest_id uuid, guest_name text, guest_invite_type text, guest_couple_members jsonb, guest_max_guests integer)
returns public.guests language plpgsql security definer set search_path = public as $$
declare updated_guest public.guests;
begin
  if not public.is_admin() then raise exception 'Acesso administrativo necessário' using errcode = '42501'; end if;
  if nullif(trim(guest_name), '') is null then raise exception 'Nome do convite é obrigatório' using errcode = '22023'; end if;
  if guest_invite_type not in ('individual','couple') then raise exception 'Tipo de convite inválido' using errcode = '22023'; end if;
  if guest_max_guests < 0 then raise exception 'Quantidade de acompanhantes inválida' using errcode = '22023'; end if;
  update public.guests set name=trim(guest_name),invite_type=guest_invite_type,couple_members=case when guest_invite_type='couple' then guest_couple_members else null end,max_guests=guest_max_guests
  where id=target_guest_id returning * into updated_guest;
  if updated_guest.id is null then raise exception 'Convidado não encontrado' using errcode = 'P0002'; end if;
  return updated_guest;
end; $$;

create or replace function public.set_guest_active(target_guest_id uuid, next_active boolean)
returns public.guests language plpgsql security definer set search_path = public as $$
declare updated_guest public.guests;
begin
  if not public.is_admin() then raise exception 'Acesso administrativo necessário' using errcode = '42501'; end if;
  update public.guests set active=next_active where id=target_guest_id returning * into updated_guest;
  if updated_guest.id is null then raise exception 'Convidado não encontrado' using errcode = 'P0002'; end if;
  if not next_active then update public.guest_access_sessions set revoked_at=now() where guest_id=target_guest_id and revoked_at is null; end if;
  return updated_guest;
end; $$;

create or replace function public.save_admin_rsvp(target_guest_id uuid, submitted_email text, submitted_food text, submitted_guest_data jsonb, submitted_message text, submitted_phone text, submitted_presence text)
returns public.rsvps language plpgsql security definer set search_path = public as $$
declare target_guest public.guests; saved_rsvp public.rsvps; companion_count integer;
begin
  if not public.is_admin() then raise exception 'Acesso administrativo necessário' using errcode = '42501'; end if;
  if submitted_presence not in ('Sim','Não') then raise exception 'Presença inválida' using errcode = '22023'; end if;
  select * into target_guest from public.guests where id=target_guest_id;
  if target_guest.id is null then raise exception 'Convidado não encontrado' using errcode = 'P0002'; end if;
  companion_count := case when jsonb_typeof(coalesce(submitted_guest_data->'companions','[]'::jsonb))='array' then jsonb_array_length(coalesce(submitted_guest_data->'companions','[]'::jsonb)) else 0 end;
  if companion_count > target_guest.max_guests then raise exception 'Quantidade de acompanhantes excede o limite do convite' using errcode = '22023'; end if;
  insert into public.rsvps(guest_id,presence,food,message,guest_data,email,phone)
  values(target_guest_id,submitted_presence,submitted_food,submitted_message,coalesce(submitted_guest_data,'{}'::jsonb),submitted_email,submitted_phone)
  on conflict(guest_id) do update set presence=excluded.presence,food=excluded.food,message=excluded.message,guest_data=excluded.guest_data,email=excluded.email,phone=excluded.phone,updated_at=now()
  returning * into saved_rsvp;
  update public.guests set confirmed=true where id=target_guest_id;
  return saved_rsvp;
end; $$;

create or replace function public.delete_admin_rsvp(target_rsvp_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare deleted_guest_id uuid;
begin
  if not public.is_admin() then raise exception 'Acesso administrativo necessário' using errcode = '42501'; end if;
  delete from public.rsvps where id=target_rsvp_id returning guest_id into deleted_guest_id;
  if deleted_guest_id is null then return false; end if;
  update public.guests set confirmed=false where id=deleted_guest_id;
  return true;
end; $$;

create or replace function public.save_current_rsvp(submitted_email text, submitted_food text, submitted_guest_data jsonb, submitted_message text, submitted_phone text, submitted_presence text)
returns setof public.rsvps language plpgsql security definer set search_path = public as $$
declare
  gid uuid := public.current_guest_id();
  target_guest public.guests;
  companion_count integer;
begin
  if gid is null then raise exception 'Sessão de convite inválida'; end if;
  if submitted_presence not in ('Sim','Não') then raise exception 'Presença inválida'; end if;
  select * into target_guest from public.guests where id=gid and active;
  if target_guest.id is null then raise exception 'Convite inválido ou inativo'; end if;
  companion_count := case when jsonb_typeof(coalesce(submitted_guest_data->'companions','[]'::jsonb))='array' then jsonb_array_length(coalesce(submitted_guest_data->'companions','[]'::jsonb)) else 0 end;
  if companion_count > target_guest.max_guests then raise exception 'Quantidade de acompanhantes excede o limite do convite' using errcode = '22023'; end if;
  insert into public.rsvps(guest_id,presence,food,message,guest_data,email,phone)
  values(gid,submitted_presence,submitted_food,submitted_message,coalesce(submitted_guest_data,'{}'::jsonb),submitted_email,submitted_phone)
  on conflict(guest_id) do update set presence=excluded.presence,food=excluded.food,message=excluded.message,guest_data=excluded.guest_data,email=excluded.email,phone=excluded.phone,updated_at=now();
  update public.guests set confirmed=true where id=gid;
  return query select * from public.rsvps where guest_id=gid;
end; $$;

revoke all on function public.update_guest_details(uuid,text,text,jsonb,integer),public.set_guest_active(uuid,boolean),public.save_admin_rsvp(uuid,text,text,jsonb,text,text,text),public.delete_admin_rsvp(uuid) from public,anon;
grant execute on function public.update_guest_details(uuid,text,text,jsonb,integer),public.set_guest_active(uuid,boolean),public.save_admin_rsvp(uuid,text,text,jsonb,text,text,text),public.delete_admin_rsvp(uuid) to authenticated;

revoke insert,update,delete on public.guests,public.rsvps from authenticated;
grant select on public.guests,public.rsvps to authenticated;
