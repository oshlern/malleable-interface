import React from "react";
import { useGameStore } from "../../state/store";
import { ITEMS } from "../../content/items";
import { X, Coins } from "lucide-react";

const MERCHANT_STOCK = [
  "health_potion",
  "greater_health_potion",
  "bread",
  "iron_sword",
  "leather_vest",
  "torch",
  "scroll_fireball",
] as const;

export function TradePanel() {
  const tradeOpen = useGameStore((s) => s.tradeOpen);
  const tradeNpc = useGameStore((s) => s.tradeNpc);
  const closeTrade = useGameStore((s) => s.closeTrade);
  const gold = useGameStore((s) => s.player.stats.gold);
  const inventory = useGameStore((s) => s.player.inventory);
  const buyItem = useGameStore((s) => s.buyItem);
  const sellItem = useGameStore((s) => s.sellItem);

  if (!tradeOpen || !tradeNpc) return null;

  const sellableItems = inventory.filter((slot) => !slot.equipped);

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-void/85 backdrop-blur-sm animate-fade-in">
      <div className="bg-abyss/95 border border-white/10 rounded-2xl w-[520px] max-h-[80vh] overflow-hidden shadow-2xl shadow-arcane-500/5 flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <h2 className="font-game text-sm text-arcane-400 tracking-wider">
            {tradeNpc.name}
          </h2>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-[10px] font-ui text-amber-400">
              <Coins size={12} />
              <span>{gold}g</span>
            </div>
            <button
              onClick={closeTrade}
              className="p-1 rounded-lg hover:bg-white/10 text-white/30 hover:text-white/60 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden divide-x divide-white/5">
          <div className="flex-1 flex flex-col min-w-0">
            <div className="px-4 py-2 border-b border-white/5">
              <span className="text-[10px] font-game text-white/40 tracking-wider">
                BUY
              </span>
            </div>
            <div className="flex-1 overflow-y-auto py-1">
              {MERCHANT_STOCK.map((itemId) => {
                const item = ITEMS[itemId];
                if (!item) return null;
                const canAfford = gold >= item.value;
                return (
                  <div
                    key={itemId}
                    className="flex items-center gap-2 px-4 py-1.5 hover:bg-white/5 transition-colors"
                  >
                    <span
                      className="text-sm font-game w-5 text-center flex-shrink-0"
                      style={{ color: item.color }}
                    >
                      {item.symbol}
                    </span>
                    <span className="text-[10px] font-ui text-white/70 flex-1 truncate">
                      {item.name}
                    </span>
                    <span className="text-[10px] font-ui text-amber-400/70 flex-shrink-0 w-10 text-right">
                      {item.value}g
                    </span>
                    <button
                      onClick={() => buyItem(itemId)}
                      disabled={!canAfford}
                      className="text-[9px] font-game px-2 py-0.5 rounded border transition-colors flex-shrink-0
                        enabled:bg-arcane-500/10 enabled:border-arcane-500/30 enabled:text-arcane-400 enabled:hover:bg-arcane-500/20
                        disabled:bg-white/5 disabled:border-white/5 disabled:text-white/15 disabled:cursor-not-allowed"
                    >
                      BUY
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex-1 flex flex-col min-w-0">
            <div className="px-4 py-2 border-b border-white/5">
              <span className="text-[10px] font-game text-white/40 tracking-wider">
                SELL
              </span>
            </div>
            <div className="flex-1 overflow-y-auto py-1">
              {sellableItems.length === 0 ? (
                <div className="px-4 py-4 text-[10px] font-ui text-white/20 text-center">
                  Nothing to sell
                </div>
              ) : (
                sellableItems.map((slot) => {
                  const sellPrice = Math.floor(slot.item.value / 2);
                  if (sellPrice <= 0) return null;
                  return (
                    <div
                      key={slot.item.id}
                      className="flex items-center gap-2 px-4 py-1.5 hover:bg-white/5 transition-colors"
                    >
                      <span
                        className="text-sm font-game w-5 text-center flex-shrink-0"
                        style={{ color: slot.item.color }}
                      >
                        {slot.item.symbol}
                      </span>
                      <span className="text-[10px] font-ui text-white/70 flex-1 truncate">
                        {slot.item.name}
                        {slot.quantity > 1 && (
                          <span className="text-white/30"> x{slot.quantity}</span>
                        )}
                      </span>
                      <span className="text-[10px] font-ui text-amber-400/70 flex-shrink-0 w-10 text-right">
                        {sellPrice}g
                      </span>
                      <button
                        onClick={() => sellItem(slot.item.id)}
                        className="text-[9px] font-game px-2 py-0.5 rounded border transition-colors flex-shrink-0
                          bg-ember-500/10 border-ember-500/30 text-ember-400 hover:bg-ember-500/20"
                      >
                        SELL
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="px-5 py-2 border-t border-white/5">
          <p className="text-[8px] font-ui text-white/15 text-center">
            Sell price is half the item's value · Esc to close
          </p>
        </div>
      </div>
    </div>
  );
}
