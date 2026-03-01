import React, { createContext, useContext, useCallback } from "react";
import { useStore } from "../../store";

interface HighlightContextValue {
  highlightedId: string | null;
  setHighlight: (id: string | null) => void;
  isHighlighted: (id: string) => boolean;
}

const HighlightContext = createContext<HighlightContextValue>({
  highlightedId: null,
  setHighlight: () => {},
  isHighlighted: () => false,
});

export function HighlightProvider({ children }: { children: React.ReactNode }) {
  const highlightedId = useStore((s) => s.highlightedInstanceId);
  const setHighlight = useStore((s) => s.setHighlight);

  const isHighlighted = useCallback(
    (id: string) => highlightedId === id,
    [highlightedId],
  );

  return (
    <HighlightContext.Provider
      value={{ highlightedId, setHighlight, isHighlighted }}
    >
      {children}
    </HighlightContext.Provider>
  );
}

export function useHighlight() {
  return useContext(HighlightContext);
}
