"use client";

import { createContext, useContext, useState } from "react";

// Bridges the chat panel and the editors/views it can fill in or be filled from, which
// sit in different parts of the page layout: when the architect proposes a recipe or a
// config, this carries it from the chat panel to the right editor; when a result view
// wants to hand a specific question to the architect (e.g. "explain these divergences"),
// it goes the other way through pendingChatMessage — without restructuring the
// surrounding server-rendered page.
interface WizardChatValue {
  pendingConfig: unknown | null;
  applyConfig: (config: unknown) => void;
  clearPendingConfig: () => void;
  pendingRecipe: unknown | null;
  applyRecipe: (recipe: unknown) => void;
  clearPendingRecipe: () => void;
  pendingChatMessage: string | null;
  sendToChat: (message: string) => void;
  clearPendingChatMessage: () => void;
}

const WizardChatContext = createContext<WizardChatValue | null>(null);

export function WizardChatProvider({ children }: { children: React.ReactNode }) {
  const [pendingConfig, setPendingConfig] = useState<unknown | null>(null);
  const [pendingRecipe, setPendingRecipe] = useState<unknown | null>(null);
  const [pendingChatMessage, setPendingChatMessage] = useState<string | null>(null);
  return (
    <WizardChatContext.Provider
      value={{
        pendingConfig,
        applyConfig: setPendingConfig,
        clearPendingConfig: () => setPendingConfig(null),
        pendingRecipe,
        applyRecipe: setPendingRecipe,
        clearPendingRecipe: () => setPendingRecipe(null),
        pendingChatMessage,
        sendToChat: setPendingChatMessage,
        clearPendingChatMessage: () => setPendingChatMessage(null),
      }}
    >
      {children}
    </WizardChatContext.Provider>
  );
}

export function useWizardChat(): WizardChatValue {
  const ctx = useContext(WizardChatContext);
  if (!ctx) throw new Error("useWizardChat must be used within WizardChatProvider");
  return ctx;
}

// Same context, but safe to call from a component that is sometimes rendered outside the
// provider (e.g. SummaryView, which is shared between the builder wizard and the
// provider-less read-only client dashboard) — returns null instead of throwing.
export function useWizardChatOptional(): WizardChatValue | null {
  return useContext(WizardChatContext);
}
