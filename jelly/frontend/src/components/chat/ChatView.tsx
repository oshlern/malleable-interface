import React, { useState, useRef, useEffect } from "react";
import { Send, Loader2 } from "lucide-react";
import { useStore } from "../../store";
import { MessageBubble } from "./MessageBubble";

export function ChatView() {
  const [input, setInput] = useState("");
  const messages = useStore((s) => s.messages);
  const model = useStore((s) => s.model);
  const loading = useStore((s) => s.loading);
  const error = useStore((s) => s.error);
  const generate = useStore((s) => s.generate);
  const sendFollowUp = useStore((s) => s.sendFollowUp);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const prompt = input.trim();
    setInput("");

    if (model) {
      sendFollowUp(prompt);
    } else {
      generate(prompt);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-200 bg-white">
        <h2 className="text-sm font-semibold text-gray-700">Chat</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">🪼</span>
            </div>
            <h3 className="text-sm font-semibold text-gray-700 mb-1">
              Welcome to Jelly
            </h3>
            <p className="text-xs text-gray-400 max-w-[200px] mx-auto">
              Describe a task and I'll create a custom interface for you.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Loader2 size={14} className="animate-spin" />
            <span>Generating...</span>
          </div>
        )}

        {error && (
          <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form
        onSubmit={handleSubmit}
        className="p-3 border-t border-gray-200 bg-white"
      >
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              model
                ? "What changes would you like?"
                : "Describe your task..."
            }
            disabled={loading}
            className="flex-1 px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
      </form>
    </div>
  );
}
