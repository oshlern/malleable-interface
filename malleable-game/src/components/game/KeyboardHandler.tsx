import { useEffect } from "react";
import { useGameStore } from "../../state/store";

export function KeyboardHandler() {
  const move = useGameStore((s) => s.move);
  const interact = useGameStore((s) => s.interact);
  const attackTarget = useGameStore((s) => s.attackTarget);
  const togglePanel = useGameStore((s) => s.togglePanel);
  const setCommandOpen = useGameStore((s) => s.setCommandOpen);
  const commandOpen = useGameStore((s) => s.commandOpen);
  const combatTarget = useGameStore((s) => s.combatTarget);
  const contextActions = useGameStore((s) => s.contextActions);
  const toggleAutopilot = useGameStore((s) => s.toggleAutopilot);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (commandOpen) return;

      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

      switch (e.key.toLowerCase()) {
        case "w":
        case "arrowup":
          e.preventDefault();
          move("up");
          break;
        case "s":
        case "arrowdown":
          e.preventDefault();
          move("down");
          break;
        case "a":
        case "arrowleft":
          e.preventDefault();
          move("left");
          break;
        case "d":
        case "arrowright":
          e.preventDefault();
          move("right");
          break;
        case "e":
          e.preventDefault();
          if (combatTarget) {
            attackTarget();
          } else {
            interact();
          }
          break;
        case "q":
          e.preventDefault();
          {
            const qAction = contextActions.find((a) => a.key === "Q");
            if (qAction) qAction.action();
          }
          break;
        case "tab": {
          e.preventDefault();
          const store = useGameStore.getState();
          if (store.gameOver) break;
          if (store.autopilot) {
            const action = store.getAutopilotAction();
            if (action) action();
          } else {
            store.executePredicted();
          }
          break;
        }
        case "i":
          e.preventDefault();
          if (!e.repeat) togglePanel("inventory");
          break;
        case "c":
          e.preventDefault();
          if (!e.repeat) togglePanel("stats");
          break;
        case "j":
          e.preventDefault();
          if (!e.repeat) togglePanel("quests");
          break;
        case "m":
          e.preventDefault();
          if (!e.repeat) togglePanel("map");
          break;
        case "p":
          e.preventDefault();
          if (!e.repeat) toggleAutopilot();
          break;
        case "/":
          e.preventDefault();
          if (!e.repeat) setCommandOpen(true);
          break;
        case "escape":
          e.preventDefault();
          setCommandOpen(false);
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    move,
    interact,
    attackTarget,
    togglePanel,
    setCommandOpen,
    commandOpen,
    combatTarget,
    contextActions,
    toggleAutopilot,
  ]);

  return null;
}
