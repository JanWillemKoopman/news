"use client";

import { createContext, useContext } from "react";

/**
 * Welk tabblad staat er open?
 *
 * Alle Kanalen-panelen blijven gemount zodra ze één keer geopend zijn (zie `AppShell`),
 * dus zonder dit zouden vijf panelen tegelijk hun selectie naar dezelfde URL schrijven en
 * elkaar overschrijven. Alleen het paneel dat open staat mag dat.
 */
const ActieveWeergave = createContext<string | null>(null);

export const ActieveWeergaveProvider = ActieveWeergave.Provider;

export function useIsActief(view: string): boolean {
  return useContext(ActieveWeergave) === view;
}
