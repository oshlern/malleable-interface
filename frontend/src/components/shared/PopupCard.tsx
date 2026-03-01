import React, { useState, useRef, useEffect } from "react";
import { X, Pin } from "lucide-react";

interface PopupCardProps {
  children: React.ReactNode;
  onClose: () => void;
  onPin?: () => void;
  title?: string;
}

export function PopupCard({ children, onClose, onPin, title }: PopupCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute z-50 bg-white rounded-xl shadow-2xl border border-gray-200 p-4 min-w-[320px] max-w-[480px] max-h-[400px] overflow-y-auto"
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-700">
          {title || "Details"}
        </h4>
        <div className="flex gap-1">
          {onPin && (
            <button
              onClick={onPin}
              className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
            >
              <Pin size={14} />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
          >
            <X size={14} />
          </button>
        </div>
      </div>
      {children}
    </div>
  );
}
