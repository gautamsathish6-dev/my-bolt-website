import { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MathRendererProps {
  text: string;
  className?: string;
}

function renderMath(latex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(latex, {
      displayMode,
      throwOnError: false,
      output: 'html',
    });
  } catch {
    return `<span class="text-red-500">${escapeHtml(latex)}</span>`;
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function processText(text: string): string {
  let result = escapeHtml(text);

  // Block math: \[...\] or $$...$$
  result = result.replace(/\\\[([\s\S]*?)\\\]/g, (_, math) => renderMath(math, true));
  result = result.replace(/\$\$([\s\S]*?)\$\$/g, (_, math) => renderMath(math, true));

  // Inline math: \(...\) or $...$
  result = result.replace(/\\\(([\s\S]*?)\\\)/g, (_, math) => renderMath(math, false));
  result = result.replace(/(?<!\\)\$([^\n$]+?)\$/g, (_, math) => renderMath(math, false));

  // Code blocks: ```...```
  result = result.replace(/```([\s\S]*?)```/g, (_, code) =>
    `<pre class="bg-slate-800 dark:bg-slate-900 text-slate-100 dark:text-slate-200 rounded-lg p-3 my-2 overflow-x-auto text-sm font-mono">${code.trim()}</pre>`
  );

  // Inline code: `...`
  result = result.replace(/`([^`]+)`/g, (_, code) =>
    `<code class="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded px-1.5 py-0.5 text-sm font-mono">${code}</code>`
  );

  // Bold: **...**
  result = result.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Italic: *...*
  result = result.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');

  // Line breaks
  result = result.replace(/\n/g, '<br/>');

  return result;
}

export function MathRenderer({ text, className }: MathRendererProps) {
  const html = useMemo(() => processText(text || ''), [text]);

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
