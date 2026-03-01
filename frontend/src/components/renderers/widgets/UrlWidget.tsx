import React, { useState } from "react";
import { ExternalLink } from "lucide-react";

interface UrlWidgetProps {
  value: string;
  editable: boolean;
  onChange: (value: string) => void;
}

export function UrlWidget({ value, editable, onChange }: UrlWidgetProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (editing && editable) {
    return (
      <input
        type="url"
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
        }}
        autoFocus
        placeholder="https://..."
        className="w-full px-2 py-1 text-sm border border-indigo-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-200"
      />
    );
  }

  if (!value) {
    return (
      <span
        onClick={() => editable && setEditing(true)}
        className="text-sm text-gray-300 italic cursor-text"
      >
        No URL
      </span>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <a
        href={value}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-indigo-600 hover:text-indigo-800 underline truncate max-w-[200px]"
      >
        {value}
      </a>
      <ExternalLink size={12} className="text-indigo-400 flex-shrink-0" />
      {editable && (
        <button
          onClick={() => setEditing(true)}
          className="text-xs text-gray-400 hover:text-gray-600 ml-1"
        >
          edit
        </button>
      )}
    </div>
  );
}
