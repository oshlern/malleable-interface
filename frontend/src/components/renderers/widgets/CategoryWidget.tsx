import React from "react";

interface CategoryWidgetProps {
  value: string;
  categories: string[];
  editable: boolean;
  onChange: (value: string) => void;
}

export function CategoryWidget({
  value,
  categories,
  editable,
  onChange,
}: CategoryWidgetProps) {
  if (editable && categories.length > 0) {
    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-2 py-1 text-sm border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
      >
        <option value="">Select...</option>
        {categories.map((cat) => (
          <option key={cat} value={cat}>
            {cat}
          </option>
        ))}
      </select>
    );
  }

  return (
    <span className="inline-block px-2 py-0.5 text-xs font-medium bg-indigo-50 text-indigo-700 rounded-full">
      {value || "Uncategorized"}
    </span>
  );
}
