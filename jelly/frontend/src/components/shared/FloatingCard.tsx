import React, { useState, useRef, useCallback } from "react";
import { X, GripHorizontal } from "lucide-react";

interface FloatingCardProps {
  children: React.ReactNode;
  onClose: () => void;
  title?: string;
  initialPosition?: { x: number; y: number };
}

export function FloatingCard({
  children,
  onClose,
  title,
  initialPosition,
}: FloatingCardProps) {
  const [pos, setPos] = useState(initialPosition || { x: 100, y: 100 });
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      dragging.current = true;
      offset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };

      const onMouseMove = (ev: MouseEvent) => {
        if (!dragging.current) return;
        setPos({
          x: ev.clientX - offset.current.x,
          y: ev.clientY - offset.current.y,
        });
      };

      const onMouseUp = () => {
        dragging.current = false;
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [pos],
  );

  return (
    <div
      className="fixed z-50 bg-white rounded-xl shadow-2xl border border-gray-200 min-w-[300px] max-w-[450px]"
      style={{ left: pos.x, top: pos.y }}
    >
      <div
        className="flex items-center justify-between px-4 py-2 border-b border-gray-100 cursor-move select-none"
        onMouseDown={onMouseDown}
      >
        <div className="flex items-center gap-2">
          <GripHorizontal size={14} className="text-gray-400" />
          <span className="text-sm font-semibold text-gray-700">
            {title || "Details"}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
        >
          <X size={14} />
        </button>
      </div>
      <div className="p-4 max-h-[350px] overflow-y-auto">{children}</div>
    </div>
  );
}
