"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

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
  // Which pipeline step the builder currently has open — lets the chat panel offer
  // quick-actions relevant to what's actually on screen instead of one fixed set.
  activeStepId: string | null;
  setActiveStepId: (id: string) => void;
  // Globale "bezig"-status: elke langlopende actie (AI-voorstel, samenvoegen, fit,
  // chatbeurt) meldt zich hier aan zodat de ActivityBar prominent kan tonen wáár de
  // app mee bezig is en hoe lang al. Meerdere acties tegelijk kunnen naast elkaar
  // bestaan; de balk toont de recentste.
  activities: Activity[];
  beginActivity: (label: string) => ActivityHandle;
}

export interface Activity {
  id: number;
  label: string;
  startedAt: number;
}

export interface ActivityHandle {
  // Label bijwerken terwijl de actie loopt (bv. "Ronde 2: …") zonder de teller te resetten.
  update: (label: string) => void;
  end: () => void;
}

const WizardChatContext = createContext<WizardChatValue | null>(null);

export function WizardChatProvider({ children }: { children: React.ReactNode }) {
  const [pendingConfig, setPendingConfig] = useState<unknown | null>(null);
  const [pendingRecipe, setPendingRecipe] = useState<unknown | null>(null);
  const [pendingChatMessage, setPendingChatMessage] = useState<string | null>(null);
  const [activeStepId, setActiveStepId] = useState<string | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const nextActivityId = useRef(1);

  const beginActivity = useCallback((label: string): ActivityHandle => {
    const id = nextActivityId.current++;
    setActivities((prev) => [...prev, { id, label, startedAt: Date.now() }]);
    return {
      update: (next: string) =>
        setActivities((prev) => prev.map((a) => (a.id === id ? { ...a, label: next } : a))),
      end: () => setActivities((prev) => prev.filter((a) => a.id !== id)),
    };
  }, []);

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
        activeStepId,
        setActiveStepId,
        activities,
        beginActivity,
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
