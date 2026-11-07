export function UnverifiedBadge({ text }: { text: string }) {
  return (
    <li className="border-l-2 border-amber bg-amber/10 px-3 py-2 text-sm text-mdc-ink">
      <span className="mr-2 inline-block bg-amber px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
        Confirm with advisor
      </span>
      {text}
    </li>
  );
}
