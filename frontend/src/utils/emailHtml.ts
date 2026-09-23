// Helpers for the Compose page's rich-text body: turning pasted text into proper email
// HTML, cleaning up HTML pasted from Word / Google Docs / web pages, and deriving the
// plain-text fallback from the HTML body.

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// True when the string already contains real markup, as opposed to plain text that just
// happens to have line breaks in it.
export function looksLikeHtml(value: string): boolean {
  return /<\/?(p|div|br|ul|ol|li|h[1-6]|table|strong|em|b|i|u|a|blockquote)\b/i.test(value);
}

// Plain text → paragraphs: a blank line starts a new <p>, a single line break becomes <br>.
export function plainTextToHtml(text: string): string {
  const normalised = text.replace(/\r\n?/g, "\n").trim();
  if (!normalised) return "";
  return normalised
    .split(/\n\s*\n/)
    .map((para) => `<p>${escapeHtml(para.trim()).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

const BLOCK_TAGS = new Set(["P", "UL", "OL", "LI", "H2", "H3", "BLOCKQUOTE"]);
const INLINE_TAGS = new Set(["STRONG", "EM", "U", "A", "BR"]);
const TAG_ALIASES: Record<string, string> = { B: "STRONG", I: "EM", H1: "H2", H4: "H3", H5: "H3", H6: "H3", DIV: "P" };
const DROP_WITH_CONTENT = new Set(["SCRIPT", "STYLE", "HEAD", "TITLE", "META", "LINK", "IMG", "SVG", "IFRAME", "OBJECT", "XML"]);

function safeHref(href: string | null): string | null {
  if (!href) return null;
  const trimmed = href.trim();
  return /^(https?:|mailto:|tel:)/i.test(trimmed) ? trimmed : null;
}

// Rebuilds pasted HTML using only a small set of email-safe tags, dropping every
// attribute except a link's href. Word/Docs styling spans are either unwrapped or turned
// into <strong>/<em> when they carry bold/italic styling.
export function sanitizeHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const out = document.createElement("div");

  function walk(node: Node, parent: HTMLElement) {
    node.childNodes.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        parent.appendChild(document.createTextNode(child.textContent ?? ""));
        return;
      }
      if (child.nodeType !== Node.ELEMENT_NODE) return;
      const el = child as HTMLElement;
      const rawTag = el.tagName.toUpperCase();
      if (DROP_WITH_CONTENT.has(rawTag) || rawTag.includes(":")) return; // e.g. Word's <o:p>

      const style = el.getAttribute("style") ?? "";
      let tag = TAG_ALIASES[rawTag] ?? rawTag;
      // Google Docs wraps everything in <b style="font-weight:normal">; treat as plain.
      if (tag === "STRONG" && /font-weight:\s*(normal|[1-5]00)\b/i.test(style)) tag = "SPAN";
      if (tag === "SPAN") {
        if (/font-weight:\s*(bold|[6-9]00)\b/i.test(style)) tag = "STRONG";
        else if (/font-style:\s*italic/i.test(style)) tag = "EM";
      }

      if (BLOCK_TAGS.has(tag) || INLINE_TAGS.has(tag)) {
        const copy = document.createElement(tag);
        if (tag === "A") {
          const href = safeHref(el.getAttribute("href"));
          if (!href) {
            walk(el, parent);
            return;
          }
          copy.setAttribute("href", href);
        }
        parent.appendChild(copy);
        walk(el, copy);
      } else {
        walk(el, parent); // unknown wrapper (span, font, section…): keep its content only
      }
    });
  }

  walk(doc.body, out);
  // Drop paragraphs that ended up empty (Word emits a lot of these).
  out.querySelectorAll("p").forEach((p) => {
    if (!p.textContent?.trim() && !p.querySelector("br")) p.remove();
  });
  return out.innerHTML;
}

// HTML body → readable plain-text fallback.
export function htmlToPlainText(html: string): string {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const lines: string[] = [];

  function inline(node: Node): string {
    let text = "";
    node.childNodes.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) text += (child.textContent ?? "").replace(/\s+/g, " ");
      else if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as HTMLElement;
        if (el.tagName === "BR") text += "\n";
        else if (el.tagName === "A") {
          const label = inline(el).trim();
          const href = el.getAttribute("href") ?? "";
          text += href && href !== label && !href.startsWith("mailto:") ? `${label} (${href})` : label;
        } else text += inline(el);
      }
    });
    return text;
  }

  function block(node: Node) {
    let pending = "";
    const flush = () => {
      if (pending.trim()) lines.push(pending.trim());
      pending = "";
    };
    node.childNodes.forEach((child) => {
      if (child.nodeType !== Node.ELEMENT_NODE) {
        pending += (child.textContent ?? "").replace(/\s+/g, " ");
        return;
      }
      const el = child as HTMLElement;
      if (el.tagName === "UL" || el.tagName === "OL") {
        flush();
        const items = Array.from(el.children).map((li, i) =>
          `${el.tagName === "OL" ? `${i + 1}.` : "-"} ${inline(li).trim()}`,
        );
        lines.push(items.join("\n"));
      } else if (["P", "DIV", "H1", "H2", "H3", "H4", "BLOCKQUOTE"].includes(el.tagName)) {
        flush();
        const text = inline(el).split("\n").map((l) => l.trim()).join("\n").trim();
        if (text) lines.push(text);
      } else if (el.tagName === "BR") {
        pending += "\n";
      } else {
        pending += inline(el);
      }
    });
    flush();
  }

  block(doc.body.firstChild ?? doc.body);
  return lines.join("\n\n");
}

const BLOCK_CHILDREN = new Set(["UL", "OL", "P", "H2", "H3", "BLOCKQUOTE", "DIV"]);

// Chrome's list command can leave a list *inside* a paragraph (<p><ul>…</ul>text</p>),
// which isn't valid HTML and which email clients split apart unpredictably. Lift any
// block element out of its <p>, wrapping the surrounding inline content in its own <p>s,
// and wrap stray top-level text in a <p>. Works on a clone of the live editor DOM --
// re-parsing the HTML string would let the parser mangle the nesting on its own.
export function fixBlockNesting(source: HTMLElement): string {
  const root = document.createElement("div");
  source.childNodes.forEach((n) => root.appendChild(n.cloneNode(true)));

  function regroup(nodes: Node[]): Node[] {
    const pieces: Node[] = [];
    let current: HTMLParagraphElement | null = null;
    nodes.forEach((child) => {
      if (child.nodeType === Node.ELEMENT_NODE && BLOCK_CHILDREN.has((child as Element).tagName)) {
        current = null;
        pieces.push(child);
      } else {
        if (!current) {
          current = document.createElement("p");
          pieces.push(current);
        }
        current.appendChild(child);
      }
    });
    return pieces.filter(
      (n) => !(n instanceof HTMLParagraphElement && !n.textContent?.trim() && !n.querySelector("br")),
    );
  }

  root.querySelectorAll("p").forEach((p) => {
    if (Array.from(p.children).some((c) => BLOCK_CHILDREN.has(c.tagName))) {
      p.replaceWith(...regroup(Array.from(p.childNodes)));
    }
  });
  const topLevel = Array.from(root.childNodes);
  if (topLevel.some((n) => !(n.nodeType === Node.ELEMENT_NODE && BLOCK_CHILDREN.has((n as Element).tagName)))) {
    const hasContent = topLevel.some((n) => n.textContent?.trim() || (n as Element).querySelector?.("br"));
    if (hasContent) root.replaceChildren(...regroup(topLevel));
  }
  return root.innerHTML;
}
