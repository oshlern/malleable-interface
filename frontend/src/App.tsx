import React from "react";
import { HighlightProvider } from "./components/shared/HighlightProvider";
import { AppLayout } from "./components/layout/AppLayout";

export default function App() {
  return (
    <HighlightProvider>
      <AppLayout />
    </HighlightProvider>
  );
}
