-- =====================================================================
-- Welkomstbericht krijgt een actieknop (metadata.acties): berichten kunnen
-- de lezer direct naar de juiste plek in de app brengen. De UI accepteert
-- alleen interne paden; zie MessageActie in lib/bruiloft/types.ts.
-- =====================================================================

create or replace function public.insert_welcome_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.messages
    (wedding_id, direction, type, onderwerp, inhoud, afzender_naam, afzender_type, status, metadata)
  values (
    new.id,
    'inbound',
    'systeem',
    'Welkom bij je berichtencentrum',
    'Hier verschijnen updates en tips over jullie bruiloft, en een overzicht van berichten die jullie naar leveranciers hebben gestuurd. Reageert een leverancier op een offerte- of contactaanvraag, dan valt die reactie hier binnen.',
    'Bruiloft Assistent',
    'systeem',
    'verzonden',
    jsonb_build_object('acties', jsonb_build_array(
      jsonb_build_object('label', 'Ontdek leveranciers', 'href', '/bruiloft/ontdekken')
    ))
  );
  return new;
end;
$$;
