import { useEffect, useRef } from "react";
import { useGameStore } from "../../state/store";

export function KeyboardHandler() {
  const move = useGameStore((s) => s.move);
  const interact = useGameStore((s) => s.interact);
  const attackTarget = useGameStore((s) => s.attackTarget);
  const executePredicted = useGameStore((s) => s.executePredicted);
  const togglePanel = useGameStore((s) => s.togglePanel);
  const setCommandOpen = useGameStore((s) => s.setCommandOpen);
  const commandOpen = useGameStore((s) => s.commandOpen);
  const combatTarget = useGameStore((s) => s.combatTarget);
  const contextActions = useGameStore((s) => s.contextActions);
  const toggleAutopilot = useGameStore((s) => s.toggleAutopilot);
  const autopilot = useGameStore((s) => s.autopilot);

  const tabHeld = useRef(false);
  const tabInterval = useRef<ReturnType<typeof setInterval> | null>(null);

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
        case "tab":
          e.preventDefault();
          if (!tabHeld.current) {
            tabHeld.current = true;
            executePredicted();

            if (autopilot) {
              tabInterval.current = setInterval(() => {
                const store = useGameStore.getState();
                if (store.gameOver) {
                  if (tabInterval.current) clearInterval(tabInterval.current);
                  return;
                }
                const action = store.getAutopilotAction();
                if (action) action();
              }, 150);
            }
          }
          break;
        case "i":
          e.preventDefault();
          togglePanel("inventory");
          break;
        case "c":
          e.preventDefault();
          togglePanel("stats");
          break;
        case "j":
          e.preventDefault();
          togglePanel("quests");
          break;
        case "m":
          e.preventDefault();
          togglePanel("map");
          break;
        case "p":
          e.preventDefault();
          toggleAutopilot();
          break;
        case "/":
          e.preventDefault();
          setCommandOpen(true);
          break;
        case "escape":
          e.preventDefault();
          setCommandOpen(false);
          break;
      }
    }

    function handleKeyUp(e: KeyboardEvent) {
      if (e.key === "Tab") {
        tabHeld.current = false;
        if (tabInterval.current) {
          clearInterval(tabInterval.current);
          tabInterval.current = null;
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      if (tabInterval.current) clearInterval(tabInterval.current);
    };
  }, [
    move,
    interact,
    attackTarget,
    executePredicted,
    togglePanel,
    setCommandOpen,
    commandOpen,
    combatTarget,
    contextActions,
    toggleAutopilot,
    autopilot,
  ]);

  return null;
}
