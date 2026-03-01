import React from "react";
import { useGameStore } from "../../state/store";
import { Package, X } from "lucide-react";
import { useAmbianceTheme } from "../shared/AmbianceTheme";

export function InventoryPanel() {
  const inventory = useGameStore((s) => s.player.inventory);
  const useItem = useGameStore((s) => s.useItem);
  const equipItem = useGameStore((s) => s.equipItem);
  const dropItem = useGameStore((s) => s.dropItem);
  const togglePanel = useGameStore((s) => s.togglePanel);
  const theme = useAmbianceTheme();

  return (
    <div className={`${theme.panelBg} border ${theme.panelBorder} rounded-lg backdrop-blur-sm animate-slide-up overflow-hidden`}>
      <div className={`flex items-center justify-between px-3 py-2 ${theme.headerBg}`}>
        <div className="flex items-center gap-1.5">
          <Package size={12} className={theme.accentColor} />
          <span className="text-[10px] font-game text-white/60 tracking-wider">
            INVENTORY
          </span>
        </div>
        <button
          onClick={() => togglePanel("inventory")}
          className="p-0.5 hover:bg-white/10 rounded text-white/30 hover:text-white/60"
        >
          <X size={12} />
        </button>
      </div>

      <div className="p-2 space-y-1 max-h-[200px] overflow-y-auto">
        {inventory.length === 0 ? (
          <p className="text-[10px] font-ui text-white/20 text-center py-3">
            Empty
          </p>
        ) : (
          inventory.map((slot) => (
            <div
              key={slot.item.id}
              className={`group flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors ${
                slot.equipped
                  ? "bg-arcane-500/15 border border-arcane-500/30"
                  : "hover:bg-white/5 border border-transparent"
              }`}
            >
              <span
                className="text-sm font-mono w-5 text-center"
                style={{ color: slot.item.color }}
              >
                {slot.item.symbol}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-ui text-white/70 truncate">
                    {slot.item.name}
                  </span>
                  {slot.quantity > 1 && (
                    <span className="text-[8px] text-white/30">
                      x{slot.quantity}
                    </span>
                  )}
                  {slot.equipped && (
                    <span className="text-[7px] text-arcane-400 font-game">
                      EQ
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                {(slot.item.type === "potion" || slot.item.type === "food") && (
                  <button
                    onClick={() => useItem(slot.item.id)}
                    className="px-1.5 py-0.5 text-[8px] font-ui text-heal-400 bg-heal-500/10 rounded hover:bg-heal-500/20"
                  >
                    Use
                  </button>
                )}
                {(slot.item.type === "weapon" ||
                  slot.item.type === "armor") && (
                  <button
                    onClick={() => equipItem(slot.item.id)}
                    className="px-1.5 py-0.5 text-[8px] font-ui text-arcane-400 bg-arcane-500/10 rounded hover:bg-arcane-500/20"
                  >
                    {slot.equipped ? "Unequip" : "Equip"}
                  </button>
                )}
                <button
                  onClick={() => dropItem(slot.item.id)}
                  className="px-1.5 py-0.5 text-[8px] font-ui text-red-400 bg-red-500/10 rounded hover:bg-red-500/20"
                >
                  Drop
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="px-3 py-1 border-t border-white/5">
        <span className="text-[8px] font-ui text-white/15">
          {inventory.length} item{inventory.length !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
}
