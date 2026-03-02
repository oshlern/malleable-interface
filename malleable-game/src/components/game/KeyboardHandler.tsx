import { useEffect, useRef } from "react";
import { useGameStore } from "../../state/store";

export function KeyboardHandler() {
  const tabAutopilotIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    function stopTabAutopilotLoop() {
      if (tabAutopilotIntervalRef.current !== null) {
        window.clearInterval(tabAutopilotIntervalRef.current);
        tabAutopilotIntervalRef.current = null;
      }
    }

    function runAutopilotStep(): boolean {
      const store = useGameStore.getState();
      if (store.gameOver || store.victory || !store.autopilot || store.menuOpen || store.commandOpen) {
        return false;
      }

      const action = store.getAutopilotAction();
      if (!action) return false;
      action();
      return true;
    }

    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
        if (e.key === "Escape") {
          e.preventDefault();
          (target as HTMLElement).blur();
        }
        return;
      }

      const store = useGameStore.getState();
      if (store.victory) return;

      if (e.key === "Escape") {
        e.preventDefault();
        if (store.tradeOpen) {
          store.closeTrade();
        } else if (store.commandOpen) {
          store.setCommandOpen(false);
        } else {
          store.setMenuOpen(!store.menuOpen);
        }
        return;
      }

      if (e.key === "Tab") {
        e.preventDefault();
        if (store.gameOver) return;
        if (store.autopilot) {
          if (e.repeat) return;
          stopTabAutopilotLoop();
          if (!runAutopilotStep()) return;
          tabAutopilotIntervalRef.current = window.setInterval(() => {
            if (!runAutopilotStep()) {
              stopTabAutopilotLoop();
            }
          }, useGameStore.getState().autopilotStepIntervalMs);
        } else if (!store.tradeOpen && !store.commandOpen && !store.menuOpen) {
          store.executePredicted();
        }
        return;
      }

      if (store.tradeOpen || store.commandOpen || store.menuOpen) return;

      switch (e.key.toLowerCase()) {
        case "w":
        case "arrowup":
          e.preventDefault();
          store.move("up");
          break;
        case "s":
        case "arrowdown":
          e.preventDefault();
          store.move("down");
          break;
        case "a":
        case "arrowleft":
          e.preventDefault();
          store.move("left");
          break;
        case "d":
        case "arrowright":
          e.preventDefault();
          store.move("right");
          break;
        case "e":
          e.preventDefault();
          if (store.combatTarget) {
            store.attackTarget();
          } else {
            store.interact();
          }
          break;
        case "q":
          e.preventDefault();
          {
            const qAction = store.contextActions.find((a) => a.key === "Q");
            if (qAction) qAction.action();
          }
          break;
        case "i":
          e.preventDefault();
          if (!e.repeat) store.togglePanel("inventory");
          break;
        case "c":
          e.preventDefault();
          if (!e.repeat) store.togglePanel("stats");
          break;
        case "j":
          e.preventDefault();
          if (!e.repeat) store.togglePanel("quests");
          break;
        case "m":
          e.preventDefault();
          if (!e.repeat) store.togglePanel("map");
          break;
        case "p":
          e.preventDefault();
          if (!e.repeat) store.toggleAutopilot();
          break;
        case "g":
          e.preventDefault();
          if (!e.repeat) store.toggleSmartPlanner();
          break;
        case "h":
          e.preventDefault();
          if (!e.repeat) useGameStore.getState().requestHint();
          break;
        case "/":
          e.preventDefault();
          if (!e.repeat) store.setCommandOpen(true);
          break;
      }
    }

    function handleKeyUp(e: KeyboardEvent) {
      if (e.key === "Tab") {
        stopTabAutopilotLoop();
      }
    }

    function handleBlur() {
      stopTabAutopilotLoop();
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);
    return () => {
      stopTabAutopilotLoop();
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

  return null;
}
