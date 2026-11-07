export function formatPay(usd: number | null, year: string): string {
  if (usd == null) return `Pay varies · ${year}`;
  return `$${usd.toLocaleString("en-US")} median · ${year}`;
}

export function formatUsd(n: number): string {
  return `$${n.toLocaleString("en-US")}`;
}

export function formatCredits(credits: number | string): string {
  return typeof credits === "number" ? `${credits} cr` : `${credits} cr`;
}
