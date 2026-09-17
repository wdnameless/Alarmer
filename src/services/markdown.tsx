/**
 * Renders a deliberately small subset of Markdown to React nodes.
 *
 * Notes are written as Markdown so they read well as plain text in the store,
 * but they must never be injected as HTML: this renderer builds elements from
 * text, so a note cannot reach `dangerouslySetInnerHTML`, the CSP or a script
 * tag. What it does not support renders as plain text rather than being
 * stripped, so the note is never mangled into unreadability.
 */

import React from 'react';

/** Escapes a URL for use in an href, dropping anything that is not a web link. */
function safeHref(raw: string): string {
  const value = raw.trim();
  if (/^https?:\/\//i.test(value) || /^mailto:/i.test(value)) return value;
  if (value.startsWith('#') || value.startsWith('/')) return value;
  return '#';
}

/** Splits a line of text into text and styled spans. */
function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  // code span, bold, italic, and link, in one pass.
  const pattern = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*\n]+\*)|(\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) out.push(text.slice(last, match.index));
    const token = match[0];

    if (token.startsWith('`')) {
      out.push(
        <code
          key={`${keyPrefix}-c${i}`}
          className="px-1 rounded font-mono text-[0.9em] bg-white/10"
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith('**')) {
      out.push(<strong key={`${keyPrefix}-b${i}`}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith('*')) {
      out.push(<em key={`${keyPrefix}-i${i}`}>{token.slice(1, -1)}</em>);
    } else {
      const inner = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (inner) {
        out.push(
          <a
            key={`${keyPrefix}-l${i}`}
            href={safeHref(inner[2])}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >
            {inner[1]}
          </a>,
        );
      } else {
        out.push(token);
      }
    }

    last = match.index + token.length;
    i += 1;
  }

  if (last < text.length) out.push(text.slice(last));
  return out;
}

/**
 * Renders Markdown into a block list.
 *
 * Supported: `#`/`##` headings, `-`/`*` unordered lists, ordered lists,
 * `> ` quotes, fenced code, inline `code`, `**bold**`, `*italic*`, links.
 */
export function renderMarkdown(source: string, keyPrefix: string): React.ReactNode[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const blocks: React.ReactNode[] = [];

  let list: React.ReactNode[] = [];
  let ordered = false;
  let inCode = false;
  let codeLines: string[] = [];

  const flushList = () => {
    if (list.length === 0) return;
    const items = list;
    list = [];
    blocks.push(
      ordered ? (
        <ol key={`${keyPrefix}-ol${blocks.length}`} className="list-decimal pl-5 space-y-0.5">
          {items}
        </ol>
      ) : (
        <ul key={`${keyPrefix}-ul${blocks.length}`} className="list-disc pl-5 space-y-0.5">
          {items}
        </ul>
      ),
    );
    ordered = false;
  };

  const flushCode = () => {
    if (!inCode) return;
    blocks.push(
      <pre
        key={`${keyPrefix}-pre${blocks.length}`}
        className="rounded-lg bg-black/40 border border-white/10 px-2.5 py-2 overflow-x-auto font-mono text-[0.85em] whitespace-pre-wrap"
      >
        {codeLines.join('\n')}
      </pre>,
    );
    codeLines = [];
    inCode = false;
  };

  for (const raw of lines) {
    const line = raw;

    if (/^\s*```/.test(line)) {
      if (inCode) {
        flushCode();
      } else {
        flushList();
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      codeLines.push(line);
      continue;
    }

    const trimmed = line.trim();
    if (trimmed === '') {
      flushList();
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      flushList();
      const level = heading[1].length;
      const cls = level === 1
        ? 'text-base font-bold'
        : level === 2
        ? 'text-sm font-bold'
        : 'text-[12px] font-semibold';
      blocks.push(
        <p key={`${keyPrefix}-h${blocks.length}`} className={cls}>
          {renderInline(heading[2], `${keyPrefix}-h${blocks.length}`)}
        </p>,
      );
      continue;
    }

    const quote = line.match(/^>\s?(.*)$/);
    if (quote) {
      flushList();
      blocks.push(
        <p
          key={`${keyPrefix}-q${blocks.length}`}
          className="border-l-2 pl-2.5 opacity-80"
          style={{ borderColor: 'rgba(255,255,255,0.2)' }}
        >
          {renderInline(quote[1], `${keyPrefix}-q${blocks.length}`)}
        </p>,
      );
      continue;
    }

    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (bullet || numbered) {
      const text = (bullet ? bullet[1] : numbered?.[1]) ?? '';
      const isOrdered = Boolean(numbered);
      if (ordered !== isOrdered) {
        flushList();
        ordered = isOrdered;
      }
      list.push(
        <li key={`${keyPrefix}-li${blocks.length}-${list.length}`}>
          {renderInline(text, `${keyPrefix}-li${blocks.length}-${list.length}`)}
        </li>,
      );
      continue;
    }

    flushList();
    blocks.push(
      <p key={`${keyPrefix}-p${blocks.length}`}>{renderInline(line, `${keyPrefix}-p${blocks.length}`)}</p>,
    );
  }

  flushList();
  flushCode();
  return blocks;
}
