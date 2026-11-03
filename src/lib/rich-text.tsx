import React from "react";

export function parseRichText(text: string | null | undefined): React.ReactNode {
  if (!text) return null;

  const regex = /(\*\*.*?\*\*|==.*?==)/g;
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("==") && part.endsWith("==")) {
      return (
        <mark key={index} className="bimlay-highlight">
          {part.slice(2, -2)}
        </mark>
      );
    }
    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
}