"use client";

import katex from "katex";
import "katex/dist/katex.min.css";
import { Fragment, useMemo } from "react";

type Segment = { kind: "text"; value: string } | { kind: "math"; value: string; display: boolean };

// Single "$" is deliberately not a delimiter: replies often mention prices and pay.
const MATH = /\\\[([\s\S]+?)\\\]|\$\$([\s\S]+?)\$\$|\\\(([\s\S]+?)\\\)/g;

function split(text: string): Segment[] {
  const segments: Segment[] = [];
  let last = 0;
  let afterDisplay = false;
  const pushText = (value: string, beforeDisplay: boolean) => {
    // Display math is already a block, so drop the line break on each side of it.
    if (afterDisplay) value = value.replace(/^\n/, "");
    if (beforeDisplay) value = value.replace(/\n$/, "");
    if (value) segments.push({ kind: "text", value });
  };
  for (const m of text.matchAll(MATH)) {
    const display = m[3] === undefined;
    pushText(text.slice(last, m.index), display);
    segments.push({ kind: "math", value: (m[1] ?? m[2] ?? m[3]).trim(), display });
    afterDisplay = display;
    last = m.index + m[0].length;
  }
  pushText(text.slice(last), false);
  return segments;
}

function Text({ value }: { value: string }) {
  return value.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") && part.length > 4 ? (
      <strong key={i} className="font-semibold text-mdc-ink">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    )
  );
}

export function TutorMessage({ content }: { content: string }) {
  const segments = useMemo(() => split(content), [content]);
  return (
    <div className="whitespace-pre-wrap">
      {segments.map((s, i) =>
        s.kind === "text" ? (
          <Text key={i} value={s.value} />
        ) : (
          <span
            key={i}
            className={s.display ? "my-2 block overflow-x-auto whitespace-normal" : "whitespace-normal"}
            // KaTeX escapes its input (trust is off by default), so this HTML is safe to inject.
            dangerouslySetInnerHTML={{
              __html: katex.renderToString(s.value, { displayMode: s.display, throwOnError: false }),
            }}
          />
        )
      )}
    </div>
  );
}
