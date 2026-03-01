import React, { useState } from "react";

interface ParagraphProps {
  value: string;
  editable: boolean;
  onChange: (value: string) => void;
}

export function Paragraph({ value, editable, onChange }: ParagraphProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (editing && editable) {
    return (
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          setEditing(false);
          if (draft !== value) onChange(draft);
        }}
        autoFocus
        rows={4}
        className="w-full px-2 py-1.5 text-sm border border-indigo-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-200 resize-y"
      />
    );
  }

  return (
    <p
      onClick={() => editable && setEditing(true)}
      className={`text-sm text-gray-600 leading-relaxed ${editable ? "cursor-text hover:bg-gray-50 px-1 py-0.5 rounded" : ""}`}
    >
      {value || <span className="text-gray-300 italic">Empty</span>}
    </p>
  );
}
