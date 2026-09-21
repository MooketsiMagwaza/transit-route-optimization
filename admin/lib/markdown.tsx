/**
 * Dependency-free Markdown renderer for repository-owned handbook pages.
 * It emits React elements only (never raw HTML) and drops links with unsafe schemes.
 */

import type { ReactNode } from "react";

export type Heading = { id: string; text: string; depth: number };
type LinkResolver = (href: string) => string | null;

export function slugify(text: string): string {
  return text.toLowerCase().replace(/[`*_[\]()]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

/** Collect h2 and h3 headings, using the same ids the renderer assigns. */
export function extractHeadings(source: string): Heading[] {
  const seen = new Map<string, number>();
  const headings: Heading[] = [];
  let fenced = false;
  for (const line of source.split(/\r?\n/)) {
    if (line.trim().startsWith("```")) { fenced = !fenced; continue; }
    const match = !fenced && /^(#{2,3})\s+(.+?)\s*#*$/.exec(line);
    if (match) headings.push({ id: uniqueId(match[2], seen), text: match[2].replace(/[`*_]/g, ""), depth: match[1].length });
  }
  return headings;
}

function uniqueId(text: string, seen: Map<string, number>): string {
  const base = slugify(text) || "section";
  const count = seen.get(base) ?? 0;
  seen.set(base, count + 1);
  return count ? `${base}-${count}` : base;
}

function safeHref(href: string, resolve: LinkResolver): string | null {
  const resolved = resolve(href);
  if (resolved) return resolved;
  if (/^https?:\/\//i.test(href) || href.startsWith("#") || href.startsWith("/")) return href;
  return null;
}

function inline(text: string, resolve: LinkResolver, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*\s][^*]*\*)|(!?\[[^\]]*\]\([^)\s]+(?:\s+"[^"]*")?\))/g;
  let last = 0;
  let index = 0;
  for (const match of text.matchAll(pattern)) {
    const at = match.index ?? 0;
    if (at > last) nodes.push(text.slice(last, at));
    const token = match[0];
    const key = `${keyPrefix}-${index++}`;
    if (match[1]) nodes.push(<code key={key}>{token.slice(1, -1)}</code>);
    else if (match[2]) nodes.push(<strong key={key}>{inline(token.slice(2, -2), resolve, key)}</strong>);
    else if (match[3]) nodes.push(<em key={key}>{inline(token.slice(1, -1), resolve, key)}</em>);
    else {
      const link = /^(!?)\[([^\]]*)\]\(([^)\s]+)/.exec(token);
      if (link) {
        const [, image, label, href] = link;
        const target = image ? null : safeHref(href, resolve);
        if (image) nodes.push(label);
        else if (target) {
          const external = /^https?:\/\//i.test(target);
          nodes.push(<a key={key} href={target} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{inline(label, resolve, key)}</a>);
        } else nodes.push(label);
      }
    }
    last = at + token.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function splitRow(line: string): string[] {
  return line.trim().replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim());
}

const LIST_ITEM = /^(\s*)([-*+]|\d+\.)\s+(.*)$/;

export function renderMarkdown(source: string, resolve: LinkResolver = () => null): ReactNode[] {
  const lines = source.split(/\r?\n/);
  const blocks: ReactNode[] = [];
  const seen = new Map<string, number>();
  let i = 0;

  const paragraphBreak = (line: string) =>
    !line.trim() || /^(#{1,6}\s|```|>|\s*([-*+]|\d+\.)\s|\|)/.test(line) || /^-{3,}$/.test(line.trim());

  while (i < lines.length) {
    const line = lines[i];
    const key = `b${i}`;
    if (!line.trim()) { i += 1; continue; }

    if (line.trim().startsWith("```")) {
      const language = line.trim().slice(3).trim();
      const code: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith("```")) code.push(lines[i++]);
      i += 1;
      blocks.push(<pre key={key} data-language={language || undefined} tabIndex={0}><code>{code.join("\n")}</code></pre>);
      continue;
    }

    const heading = /^(#{1,6})\s+(.+?)\s*#*$/.exec(line);
    if (heading) {
      const depth = heading[1].length;
      const id = depth >= 2 && depth <= 3 ? uniqueId(heading[2], seen) : slugify(heading[2]);
      const Tag = `h${depth}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
      blocks.push(<Tag key={key} id={id}>{inline(heading[2], resolve, key)}</Tag>);
      i += 1;
      continue;
    }

    if (/^-{3,}$/.test(line.trim())) { blocks.push(<hr key={key} />); i += 1; continue; }

    if (line.trim().startsWith(">")) {
      const quote: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) quote.push(lines[i++].replace(/^\s*>\s?/, ""));
      blocks.push(<blockquote key={key}>{renderMarkdown(quote.join("\n"), resolve)}</blockquote>);
      continue;
    }

    if (line.trim().startsWith("|") && i + 1 < lines.length && /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(lines[i + 1])) {
      const header = splitRow(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) rows.push(splitRow(lines[i++]));
      blocks.push(
        <div className="handbook-table" key={key}><table>
          <thead><tr>{header.map((cell, c) => <th key={c} scope="col">{inline(cell, resolve, `${key}h${c}`)}</th>)}</tr></thead>
          <tbody>{rows.map((row, r) => <tr key={r}>{row.map((cell, c) => <td key={c}>{inline(cell, resolve, `${key}r${r}c${c}`)}</td>)}</tr>)}</tbody>
        </table></div>,
      );
      continue;
    }

    const first = LIST_ITEM.exec(line);
    if (first) {
      const baseIndent = first[1].length;
      const ordered = /\d/.test(first[2]);
      const items: { text: string; children: string[] }[] = [];
      while (i < lines.length) {
        const item = LIST_ITEM.exec(lines[i]);
        if (item && item[1].length <= baseIndent) items.push({ text: item[3], children: [] });
        else if (item && items.length) items[items.length - 1].children.push(lines[i]);
        else if (lines[i].trim() && /^\s+/.test(lines[i]) && items.length) items[items.length - 1].children.push(lines[i]);
        else break;
        i += 1;
      }
      const List = ordered ? "ol" : "ul";
      blocks.push(
        <List key={key}>{items.map((item, n) => {
          const task = /^\[( |x|X)\]\s+(.*)$/.exec(item.text);
          return (
            <li key={n} className={task ? "task" : undefined}>
              {task && <input type="checkbox" checked={task[1] !== " "} readOnly aria-label={task[1] !== " " ? "Done" : "Not done"} />}
              {inline(task ? task[2] : item.text, resolve, `${key}i${n}`)}
              {item.children.length > 0 && renderMarkdown(item.children.map((child) => child.slice(Math.min(baseIndent + 2, child.length - child.trimStart().length))).join("\n"), resolve)}
            </li>
          );
        })}</List>,
      );
      continue;
    }

    const paragraph = [line.trim()];
    i += 1;
    while (i < lines.length && !paragraphBreak(lines[i])) paragraph.push(lines[i++].trim());
    blocks.push(<p key={key}>{inline(paragraph.join(" "), resolve, key)}</p>);
  }
  return blocks;
}
