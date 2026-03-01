import React from "react";
import { GameCanvas } from "./components/game/GameCanvas";
import { KeyboardHandler } from "./components/game/KeyboardHandler";
import { GameOver } from "./components/game/GameOver";
import { VictoryScreen } from "./components/game/VictoryScreen";
import { HealthBar } from "./components/hud/HealthBar";
import { ActionBar } from "./components/hud/ActionBar";
import { HudOverlay } from "./components/hud/HudOverlay";
import { CommandBar } from "./components/command/CommandBar";
import { TradePanel } from "./components/hud/TradePanel";
import { PauseMenu } from "./components/menu/PauseMenu";

export default function App() {
  return (
    <div className="h-screen w-screen bg-void text-white overflow-hidden flex flex-col">
      <KeyboardHandler />

      <HealthBar />

      <div className="flex-1 relative overflow-hidden">
        <GameCanvas />
        <HudOverlay />
        <CommandBar />
        <TradePanel />
        <PauseMenu />
        <GameOver />
        <VictoryScreen />
      </div>

      <ActionBar />
    </div>
  );
}
