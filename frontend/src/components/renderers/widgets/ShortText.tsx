import React, { useState } from "react";

interface ShortTextProps {
  value: string;
  editable: boolean;
  isTitle?: boolean;
  onChange: (value: string) => void;
}

export function ShortText({ value, editable, isTitle, onChange }: ShortTextProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (editing && editable) {
    return (
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          setEditing(false);
          if (draft !== value) onChange(draft);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            setEditing(false);
            if (draft !== value) onChange(draft);
          }
          if (e.key === "Escape") {
            setEditing(false);
            setDraft(value);
          }
        }}
        autoFocus
        className="w-full px-2 py-1 text-sm border border-indigo-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-200"
      />
    );
  }

  return (
    <span
      onClick={() => editable && setEditing(true)}
      className={`${isTitle ? "text-base font-semibold text-gray-900" : "text-sm text-gray-700"} ${editable ? "cursor-text hover:bg-gray-50 px-1 py-0.5 rounded" : ""}`}
    >
      {value || <span className="text-gray-300 italic">Empty</span>}
    </span>
  );
}
