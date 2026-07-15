"use client";

import { createContext, useContext, useState } from "react";

// Bridges the chat panel and the model-config editor, which sit in different parts of
// the page layout: when the architect proposes a config, this carries it from the chat
// panel to the JSON editor without restructuring the surrounding server-rendered page.
interface WizardChatValue {
  pendingConfig: unknown | null;
  applyConfig: (config: unknown) => void;
  clearPendingConfig: () => void;
}

const WizardChatContext = createContext<WizardChatValue | null>(null);

export function WizardChatProvider({ children }: { children: React.ReactNode }) {
  const [pendingConfig, setPendingConfig] = useState<unknown | null>(null);
  return (
    <WizardChatContext.Provider
      value={{
        pendingConfig,
        applyConfig: setPendingConfig,
        clearPendingConfig: () => setPendingConfig(null),
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
