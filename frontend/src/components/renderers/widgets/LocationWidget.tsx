import React, { useState } from "react";
import { MapPin } from "lucide-react";

interface LocationWidgetProps {
  value: string;
  editable: boolean;
  onChange: (value: string) => void;
}

export function LocationWidget({
  value,
  editable,
  onChange,
}: LocationWidgetProps) {
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
        }}
        autoFocus
        placeholder="Enter location..."
        className="w-full px-2 py-1 text-sm border border-indigo-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-200"
      />
    );
  }

  return (
    <span
      onClick={() => editable && setEditing(true)}
      className={`inline-flex items-center gap-1.5 text-sm text-gray-700 ${editable ? "cursor-pointer hover:bg-gray-50 px-1 py-0.5 rounded" : ""}`}
    >
      <MapPin size={14} className="text-indigo-400" />
      {value || <span className="text-gray-300 italic">No location</span>}
    </span>
  );
}
