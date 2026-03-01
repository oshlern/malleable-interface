import React from "react";
import type { Attribute } from "@jelly/shared";
import {
  Hash,
  Type,
  Link,
  List,
  BookOpen,
  Clock,
  MapPin,
  Tag,
  EyeOff,
  Globe,
} from "lucide-react";

interface AttributeNodeProps {
  name: string;
  attribute: Attribute;
}

const typeIcons: Record<string, React.ReactNode> = {
  shortText: <Type size={12} />,
  paragraph: <BookOpen size={12} />,
  number: <Hash size={12} />,
  time: <Clock size={12} />,
  location: <MapPin size={12} />,
  category: <Tag size={12} />,
  url: <Globe size={12} />,
  hidden: <EyeOff size={12} />,
};

export function AttributeNode({ name, attribute }: AttributeNodeProps) {
  const getIcon = () => {
    switch (attribute.type) {
      case "SVAL":
        return typeIcons[attribute.render] || <Type size={12} />;
      case "PNTR":
        return <Link size={12} />;
      case "ARRY":
        return <List size={12} />;
      case "DICT":
        return <BookOpen size={12} />;
      default:
        return <Type size={12} />;
    }
  };

  const getTypeLabel = () => {
    switch (attribute.type) {
      case "SVAL":
        return attribute.dataType;
      case "PNTR":
        return `→ ${attribute.entityRef}`;
      case "ARRY":
        return `[${attribute.item.type.replace(/__/g, "")}]`;
      case "DICT":
        return "dict";
    }
  };

  const isHidden =
    attribute.type === "SVAL" &&
    (attribute.render === "hidden" ||
      attribute.function === "privateIdentifier");

  return (
    <div
      className={`flex items-center gap-2 py-0.5 text-xs ${
        isHidden ? "opacity-40" : ""
      }`}
    >
      <span className="text-gray-400 flex-shrink-0">{getIcon()}</span>
      <span className="text-gray-700 truncate flex-1">{name}</span>
      <span className="text-gray-400 text-[10px] font-mono flex-shrink-0">
        {getTypeLabel()}
      </span>
    </div>
  );
}
