-- =====================================================================
-- Limiet op vendor_documents: maximaal 10 documenten per leverancier,
-- zodat de storage niet ongecontroleerd kan volgroeien. Serverautoritatief
-- via een trigger — de insert loopt rechtstreeks vanuit de client tegen
-- Supabase, dus een UI-check alleen is niet genoeg (en botst anders stil
-- bij twee gelijktijdige uploads door verschillende gebruikers).
-- =====================================================================

create or replace function public.vendor_documents_check_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.vendor_documents where vendor_id = new.vendor_id) >= 10 then
    raise exception 'Maximaal 10 documenten per leverancier';
  end if;
  return new;
end;
$$;

create trigger trg_vendor_documents_check_limit before insert on public.vendor_documents
  for each row execute function public.vendor_documents_check_limit();
