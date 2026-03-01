import React, { useState } from "react";
import { Database, MessageSquare } from "lucide-react";
import { SchemaView } from "../schema/SchemaView";
import { ChatView } from "../chat/ChatView";

type SidebarTab = "chat" | "schema";

export function Sidebar() {
  const [activeTab, setActiveTab] = useState<SidebarTab>("chat");

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab("chat")}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors ${
            activeTab === "chat"
              ? "text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50"
              : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          }`}
        >
          <MessageSquare size={14} />
          Chat
        </button>
        <button
          onClick={() => setActiveTab("schema")}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors ${
            activeTab === "schema"
              ? "text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50"
              : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          }`}
        >
          <Database size={14} />
          Schema
        </button>
      </div>

      <div className="flex-1 overflow-hidden">
        {activeTab === "chat" ? <ChatView /> : <SchemaView />}
      </div>
    </div>
  );
}
