import React, { useState } from "react";
import { Copy, Check } from "lucide-react";

interface SeedDisplayProps {
  seed: number;
  size?: "sm" | "md";
}

export function SeedDisplay({ seed, size = "sm" }: SeedDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(String(seed));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const textSize = size === "md" ? "text-xs" : "text-[9px]";
  const iconSize = size === "md" ? 12 : 10;
  const px = size === "md" ? "px-2.5 py-1.5" : "px-1.5 py-0.5";

  return (
    <button
      onClick={handleCopy}
      className={`group inline-flex items-center gap-1.5 ${px} rounded-md bg-white/5 border border-white/10 hover:border-arcane-500/30 hover:bg-arcane-500/5 transition-all`}
    >
      <span className={`font-mono ${textSize} text-white/30 group-hover:text-white/50`}>
        Seed: {seed}
      </span>
      {copied ? (
        <Check size={iconSize} className="text-heal-400" />
      ) : (
        <Copy size={iconSize} className="text-white/20 group-hover:text-white/40" />
      )}
    </button>
  );
}
