-- Execute uma vez no SQL Editor do Supabase para instalações existentes.
alter table public.guests
  add column if not exists invite_sent boolean not null default false;

create or replace function public.create_guest_with_invite(
  guest_name text,
  guest_invite_type text default 'individual',
  guest_couple_members jsonb default null,
  guest_max_guests integer default 0,
  guest_invite_sent boolean default false
)
returns public.guests
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  code_alphabet constant text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  generated_code text;
  random_bytes bytea;
  code_position integer;
  created_guest public.guests;
begin
  if not public.is_admin() then
    raise exception 'Acesso administrativo necessário' using errcode = '42501';
  end if;

  if nullif(trim(guest_name), '') is null then
    raise exception 'Nome do convite é obrigatório' using errcode = '22023';
  end if;

  if guest_invite_type not in ('individual', 'couple') then
    raise exception 'Tipo de convite inválido' using errcode = '22023';
  end if;

  if guest_max_guests < 0 then
    raise exception 'Quantidade de acompanhantes inválida' using errcode = '22023';
  end if;

  loop
    generated_code := '';
    random_bytes := gen_random_bytes(8);

    for code_position in 0..7 loop
      generated_code := generated_code || substr(
        code_alphabet,
        (get_byte(random_bytes, code_position) % length(code_alphabet)) + 1,
        1
      );
    end loop;

    begin
      insert into public.guests (
        name, invite_code, invite_type, couple_members, max_guests,
        confirmed, active, access_count, invite_sent
      ) values (
        trim(guest_name), generated_code, guest_invite_type,
        case when guest_invite_type = 'couple' then guest_couple_members else null end,
        guest_max_guests, false, true, 0, coalesce(guest_invite_sent, false)
      )
      returning * into created_guest;
      return created_guest;
    exception when unique_violation then
      -- Gere outro código no caso extremamente improvável de colisão.
    end;
  end loop;
end;
$$;

revoke all on function public.create_guest_with_invite(text,text,jsonb,integer,boolean) from public, anon;
grant execute on function public.create_guest_with_invite(text,text,jsonb,integer,boolean) to authenticated;
