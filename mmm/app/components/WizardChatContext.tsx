"use client";

import { createContext, useContext, useState } from "react";

// Bridges the chat panel and the two editors it can fill in, which sit in different
// parts of the page layout: when the architect proposes a recipe or a config, this
// carries it from the chat panel to the right editor without restructuring the
// surrounding server-rendered page.
interface WizardChatValue {
  pendingConfig: unknown | null;
  applyConfig: (config: unknown) => void;
  clearPendingConfig: () => void;
  pendingRecipe: unknown | null;
  applyRecipe: (recipe: unknown) => void;
  clearPendingRecipe: () => void;
}

const WizardChatContext = createContext<WizardChatValue | null>(null);

export function WizardChatProvider({ children }: { children: React.ReactNode }) {
  const [pendingConfig, setPendingConfig] = useState<unknown | null>(null);
  const [pendingRecipe, setPendingRecipe] = useState<unknown | null>(null);
  return (
    <WizardChatContext.Provider
      value={{
        pendingConfig,
        applyConfig: setPendingConfig,
        clearPendingConfig: () => setPendingConfig(null),
        pendingRecipe,
        applyRecipe: setPendingRecipe,
        clearPendingRecipe: () => setPendingRecipe(null),
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
