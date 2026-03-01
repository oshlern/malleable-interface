import React from "react";
import { Sidebar } from "./Sidebar";
import { PanelManager } from "../panels/PanelManager";
import { useStore } from "../../store";
import { Loader2 } from "lucide-react";

export function AppLayout() {
  const model = useStore((s) => s.model);
  const loading = useStore((s) => s.loading);

  return (
    <div className="flex h-screen bg-gray-50">
      <div className="w-[340px] flex-shrink-0 h-full">
        <Sidebar />
      </div>

      <div className="flex-1 overflow-hidden">
        {model ? (
          <PanelManager />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-md">
              {loading ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2
                    size={32}
                    className="animate-spin text-indigo-400"
                  />
                  <p className="text-sm text-gray-500">
                    Generating your interface...
                  </p>
                </div>
              ) : (
                <>
                  <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center mx-auto mb-4">
                    <span className="text-4xl">🪼</span>
                  </div>
                  <h1 className="text-xl font-bold text-gray-800 mb-2">
                    Jelly
                  </h1>
                  <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                    Generative and malleable user interfaces.
                    <br />
                    Describe your task in the chat to get started.
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {[
                      "I am hosting a dinner party",
                      "Plan a trip to Tokyo",
                      "Give me a weekly meal plan",
                      "Research colleges to attend",
                    ].map((example) => (
                      <ExampleChip key={example} text={example} />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ExampleChip({ text }: { text: string }) {
  const generate = useStore((s) => s.generate);
  const loading = useStore((s) => s.loading);

  return (
    <button
      onClick={() => !loading && generate(text)}
      disabled={loading}
      className="px-3 py-1.5 text-xs text-gray-600 bg-white border border-gray-200 rounded-full hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all disabled:opacity-50"
    >
      {text}
    </button>
  );
}
