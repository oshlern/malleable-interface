import React from "react";
import { User, Bot, RotateCcw } from "lucide-react";
import type { ChatMessage } from "../../store";
import { useStore } from "../../store";

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const restoreFromHistory = useStore((s) => s.restoreFromHistory);

  const isUser = message.role === "user";

  return (
    <div className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
          isUser ? "bg-indigo-100 text-indigo-600" : "bg-gray-100 text-gray-500"
        }`}
      >
        {isUser ? <User size={14} /> : <Bot size={14} />}
      </div>

      <div
        className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "bg-indigo-600 text-white"
            : "bg-gray-100 text-gray-800"
        }`}
      >
        <p>{message.content}</p>

        {message.modelSnapshot && (
          <button
            onClick={() => restoreFromHistory(message.id)}
            className={`flex items-center gap-1 mt-1.5 text-xs transition-colors ${
              isUser
                ? "text-indigo-200 hover:text-white"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <RotateCcw size={10} />
            Restore this state
          </button>
        )}
      </div>
    </div>
  );
}
