import React, { useState } from "react";

interface NumberWidgetProps {
  value: number;
  editable: boolean;
  onChange: (value: number) => void;
}

export function NumberWidget({ value, editable, onChange }: NumberWidgetProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));

  if (editing && editable) {
    return (
      <input
        type="number"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          setEditing(false);
          const num = parseFloat(draft);
          if (!isNaN(num) && num !== value) onChange(num);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            setEditing(false);
            const num = parseFloat(draft);
            if (!isNaN(num)) onChange(num);
          }
        }}
        autoFocus
        className="w-24 px-2 py-1 text-sm border border-indigo-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-200"
      />
    );
  }

  return (
    <span
      onClick={() => editable && setEditing(true)}
      className={`text-sm font-mono text-gray-700 ${editable ? "cursor-text hover:bg-gray-50 px-1 py-0.5 rounded" : ""}`}
    >
      {typeof value === "number" ? value.toLocaleString() : value}
    </span>
  );
}
