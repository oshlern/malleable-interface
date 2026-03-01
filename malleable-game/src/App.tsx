import React from "react";
import { GameCanvas } from "./components/game/GameCanvas";
import { KeyboardHandler } from "./components/game/KeyboardHandler";
import { GameOver } from "./components/game/GameOver";
import { HealthBar } from "./components/hud/HealthBar";
import { ActionBar } from "./components/hud/ActionBar";
import { HudOverlay } from "./components/hud/HudOverlay";
import { CommandBar } from "./components/command/CommandBar";

export default function App() {
  return (
    <div className="h-screen w-screen bg-void text-white overflow-hidden flex flex-col">
      <KeyboardHandler />

      <HealthBar />

      <div className="flex-1 relative overflow-hidden">
        <GameCanvas />
        <HudOverlay />
        <CommandBar />
        <GameOver />
      </div>

      <ActionBar />
    </div>
  );
}
