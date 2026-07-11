-- =====================================================================
-- Limiet op budget_item_documents: maximaal 10 documenten per budgetpost,
-- zodat de storage niet ongecontroleerd kan volgroeien. Zelfde patroon als
-- vendor_documents_check_limit (0074). Serverautoritatief via een trigger —
-- de insert loopt rechtstreeks vanuit de client tegen Supabase, dus een
-- UI-check alleen is niet genoeg (en botst anders stil bij twee
-- gelijktijdige uploads door verschillende gebruikers).
-- =====================================================================

create or replace function public.budget_item_documents_check_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.budget_item_documents where budget_item_id = new.budget_item_id) >= 10 then
    raise exception 'Maximaal 10 documenten per budgetpost';
  end if;
  return new;
end;
$$;

create trigger trg_budget_item_documents_check_limit before insert on public.budget_item_documents
  for each row execute function public.budget_item_documents_check_limit();
