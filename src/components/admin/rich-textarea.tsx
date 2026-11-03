"use client";

import { useRef, type TextareaHTMLAttributes } from "react";
import { Bold, Highlighter } from "lucide-react";

type Props = TextareaHTMLAttributes<HTMLTextAreaElement>;

export default function RichTextarea({ name, defaultValue, ...props }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);

  function formatText(type: "bold" | "highlight") {
    const textarea = ref.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;

    const marker = type === "bold" ? "**" : "==";
    const selected = value.substring(start, end);
    const before = value.substring(0, start);
    const after = value.substring(end);

    // Wrap the selected text (or insert markers if nothing selected)
    const newValue = `${before}${marker}${selected}${marker}${after}`;

    textarea.value = newValue;
    textarea.focus();
    
    // Keep the cursor inside or after the markers
    textarea.setSelectionRange(
      start + marker.length,
      end + marker.length
    );
    
    // Trigger React's onChange (if any) to update the form state
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  }

  return (
    <div className="rich-textarea-wrapper">
      <div className="rich-textarea-toolbar">
        <button
          type="button"
          onClick={() => formatText("bold")}
          title="Make Bold (Ctrl+B)"
        >
          <Bold size={16} />
        </button>
        <button
          type="button"
          onClick={() => formatText("highlight")}
          title="Highlight Text"
        >
          <Highlighter size={16} />
        </button>
      </div>
      <textarea
        ref={ref}
        name={name}
        defaultValue={defaultValue}
        className="rich-textarea-input"
        {...props}
      />
    </div>
  );
}