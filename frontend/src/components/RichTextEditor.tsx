import { ClipboardEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { looksLikeHtml, plainTextToHtml, sanitizeHtml } from "../utils/emailHtml";

// Formatted email-body editor. Pasting plain text produces real paragraphs (blank line =
// new paragraph, single line break = <br>); pasting from Word / Google Docs / a web page
// keeps bold, italics, lists and links but strips their styling junk. "HTML source" still
// lets the raw markup be edited directly.

type Command = "bold" | "italic" | "underline" | "insertUnorderedList" | "insertOrderedList" | "removeFormat";

const TOOLBAR: { command: Command; label: string; title: string; className?: string }[] = [
  { command: "bold", label: "B", title: "Bold (Ctrl/Cmd+B)", className: "font-bold" },
  { command: "italic", label: "I", title: "Italic (Ctrl/Cmd+I)", className: "italic" },
  { command: "underline", label: "U", title: "Underline (Ctrl/Cmd+U)", className: "underline" },
  { command: "insertUnorderedList", label: "• List", title: "Bulleted list" },
  { command: "insertOrderedList", label: "1. List", title: "Numbered list" },
  { command: "removeFormat", label: "Clear", title: "Clear formatting on the selection" },
];

// An empty paragraph as the editor leaves it, e.g. "<p><br></p>" or "<p><b><br></b></p>".
const EMPTY_PARA = String.raw`<p>(?:\s|<(?:b|strong|i|em|u)>|<\/(?:b|strong|i|em|u)>|<br\s*\/?>|&nbsp;)*<\/p>`;

function normalise(html: string): string {
  // Trailing empty paragraphs (from pressing Enter at the end) would add blank space at
  // the bottom of every email; an editor emptied by the user is treated as empty.
  const trimmed = html.replace(new RegExp(`(?:${EMPTY_PARA}|<br\\s*\\/?>|\\s)+$`, "i"), "");
  return trimmed.replace(new RegExp(EMPTY_PARA, "gi"), "").trim() ? trimmed : "";
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastEmitted = useRef<string | null>(null);
  const savedRange = useRef<Range | null>(null);
  const [sourceMode, setSourceMode] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("https://");
  const [isEmpty, setIsEmpty] = useState(!value);

  // Uncontrolled contentEditable: only rewrite the DOM when the value changed from
  // outside (draft loaded, HTML-source edits), never on our own keystrokes -- rewriting
  // innerHTML on every input would throw the caret back to the start.
  useEffect(() => {
    const el = editorRef.current;
    if (sourceMode || !el) return;
    // (the div is remounted when leaving HTML-source mode, so a fresh one always gets filled)
    if (value === lastEmitted.current && el.dataset.filled) return;
    const isPlainText = !!value && !looksLikeHtml(value);
    el.innerHTML = isPlainText ? plainTextToHtml(value) : value;
    el.dataset.filled = "1";
    lastEmitted.current = value;
    setIsEmpty(!value);
    // An older draft saved as raw text: store the paragraph version from now on.
    if (isPlainText) emit();
  }, [value, sourceMode]);

  function emit() {
    const html = normalise(editorRef.current?.innerHTML ?? "");
    lastEmitted.current = html;
    setIsEmpty(!html);
    onChange(html);
  }

  function run(command: Command) {
    editorRef.current?.focus();
    document.execCommand(command);
    emit();
  }

  function handleFocus() {
    // Make Enter create <p> paragraphs rather than Chrome's default <div>s.
    document.execCommand("defaultParagraphSeparator", false, "p");
  }

  function handlePaste(e: ClipboardEvent<HTMLDivElement>) {
    e.preventDefault();
    const html = e.clipboardData.getData("text/html");
    const text = e.clipboardData.getData("text/plain");
    const clean = html ? sanitizeHtml(html) : plainTextToHtml(text);
    if (clean) document.execCommand("insertHTML", false, clean);
    emit();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    // Browsers only apply Ctrl/Cmd+U inconsistently inside contentEditable.
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "u") {
      e.preventDefault();
      run("underline");
    }
  }

  function openLink() {
    const sel = window.getSelection();
    savedRange.current = sel && sel.rangeCount > 0 ? sel.getRangeAt(0).cloneRange() : null;
    setLinkUrl("https://");
    setLinkOpen(true);
  }

  function applyLink() {
    const url = linkUrl.trim();
    setLinkOpen(false);
    if (!/^(https?:\/\/|mailto:|tel:)\S+/i.test(url)) return;
    editorRef.current?.focus();
    const sel = window.getSelection();
    if (savedRange.current && sel) {
      sel.removeAllRanges();
      sel.addRange(savedRange.current);
    }
    if (sel && !sel.isCollapsed) document.execCommand("createLink", false, url);
    else document.execCommand("insertHTML", false, `<a href="${url.replace(/"/g, "&quot;")}">${url}</a>`);
    emit();
  }

  const toolbarButton = "rounded px-2 py-1 text-sm text-navy hover:bg-navy/5 disabled:opacity-40";

  return (
    <div className="mt-1 rounded border border-navy/20">
      <div className="flex flex-wrap items-center gap-1 border-b border-navy/10 bg-navy/[0.02] px-2 py-1">
        {TOOLBAR.map((t) => (
          <button
            key={t.command}
            type="button"
            title={t.title}
            disabled={sourceMode}
            // mousedown + preventDefault keeps the text selection while clicking
            onMouseDown={(e) => {
              e.preventDefault();
              run(t.command);
            }}
            className={`${toolbarButton} ${t.className ?? ""}`}
          >
            {t.label}
          </button>
        ))}
        <button
          type="button"
          title="Add a link to the selected text"
          disabled={sourceMode}
          onMouseDown={(e) => {
            e.preventDefault();
            openLink();
          }}
          className={toolbarButton}
        >
          Link
        </button>
        <button
          type="button"
          onClick={() => setSourceMode((s) => !s)}
          className="ml-auto rounded px-2 py-1 text-xs text-gold hover:underline"
        >
          {sourceMode ? "Back to formatted editor" : "Edit HTML source"}
        </button>
      </div>

      {linkOpen && (
        <div className="flex items-center gap-2 border-b border-navy/10 px-3 py-2">
          <input
            autoFocus
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyLink();
              }
              if (e.key === "Escape") setLinkOpen(false);
            }}
            placeholder="https://hellocareconsulting.com/…"
            className="w-full max-w-md rounded border border-navy/20 px-2 py-1 text-sm"
          />
          <button type="button" onClick={applyLink} className="rounded bg-navy px-3 py-1 text-xs text-white">
            Add link
          </button>
          <button type="button" onClick={() => setLinkOpen(false)} className="text-xs text-navy/60 hover:underline">
            Cancel
          </button>
        </div>
      )}

      {sourceMode ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={14}
          className="block w-full rounded-b px-3 py-2 font-mono text-sm outline-none"
        />
      ) : (
        <div className="relative">
          {isEmpty && placeholder && (
            <div className="pointer-events-none absolute left-3 top-2 text-sm text-navy/35">{placeholder}</div>
          )}
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={emit}
            onFocus={handleFocus}
            onPaste={handlePaste}
            onKeyDown={handleKeyDown}
            className="email-body min-h-[16rem] px-3 py-2 text-sm leading-relaxed text-navy outline-none"
          />
        </div>
      )}
    </div>
  );
}
