import React, { useState } from "react";
import { Calendar } from "lucide-react";

interface TimeWidgetProps {
  value: string;
  editable: boolean;
  onChange: (value: string) => void;
}

export function TimeWidget({ value, editable, onChange }: TimeWidgetProps) {
  const [editing, setEditing] = useState(false);

  const displayValue = value
    ? new Date(value).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "";

  if (editing && editable) {
    return (
      <input
        type="datetime-local"
        defaultValue={value ? new Date(value).toISOString().slice(0, 16) : ""}
        onChange={(e) => {
          onChange(new Date(e.target.value).toISOString());
        }}
        onBlur={() => setEditing(false)}
        autoFocus
        className="px-2 py-1 text-sm border border-indigo-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-200"
      />
    );
  }

  return (
    <span
      onClick={() => editable && setEditing(true)}
      className={`inline-flex items-center gap-1.5 text-sm text-gray-700 ${editable ? "cursor-pointer hover:bg-gray-50 px-1 py-0.5 rounded" : ""}`}
    >
      <Calendar size={14} className="text-gray-400" />
      {displayValue || <span className="text-gray-300 italic">No date</span>}
    </span>
  );
}
