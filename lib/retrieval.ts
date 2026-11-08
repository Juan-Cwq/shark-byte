// lib/retrieval.ts
// Pure, browser-safe keyword retrieval (BM25) over the student's notes and past sessions.
// Picks the few passages worth sending with a tutor question; nothing here calls the network.

const PASSAGE_CHARS = 900;
const K1 = 1.2;
const B = 0.75;

const STOPWORDS = new Set(
  (
    "a an and are as at be but by can do does for from how i if in into is it its me my of on or so that the " +
    "their them then there these they this to was we what when where which who why will with you your about " +
    "explain tell help please show give more again also just like"
  ).split(" ")
);

export interface Passage {
  docId: string;
  title: string;
  text: string;
}

export interface Hit<T> {
  item: T;
  score: number;
}

export function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

/** Splits a document into ~900-character passages on paragraph, then sentence, boundaries. */
export function chunk(docId: string, title: string, text: string): Passage[] {
  const pieces = text
    .split(/\n\s*\n/)
    .flatMap((para) => (para.length <= PASSAGE_CHARS ? [para] : para.split(/(?<=[.!?])\s+/)))
    .flatMap((s) => {
      const out: string[] = [];
      for (let i = 0; i < s.length; i += PASSAGE_CHARS) out.push(s.slice(i, i + PASSAGE_CHARS));
      return out;
    })
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const passages: Passage[] = [];
  let current = "";
  for (const piece of pieces) {
    if (current && current.length + piece.length + 1 > PASSAGE_CHARS) {
      passages.push({ docId, title, text: current });
      current = "";
    }
    current = current ? `${current} ${piece}` : piece;
  }
  if (current) passages.push({ docId, title, text: current });
  return passages;
}

/** Ranks items against the query with BM25 and returns the best `limit` that share at least one term. */
export function rank<T>(query: string, items: T[], textOf: (item: T) => string, limit: number): Hit<T>[] {
  const terms = [...new Set(tokenize(query))];
  if (!terms.length || !items.length) return [];

  const docs = items.map((item) => {
    const tokens = tokenize(textOf(item));
    const tf = new Map<string, number>();
    for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
    return { item, tf, length: tokens.length };
  });
  const avgLength = docs.reduce((n, d) => n + d.length, 0) / docs.length || 1;
  const idf = new Map(
    terms.map((t) => {
      const n = docs.filter((d) => d.tf.has(t)).length;
      return [t, Math.log(1 + (docs.length - n + 0.5) / (n + 0.5))];
    })
  );

  return docs
    .map(({ item, tf, length }) => {
      let score = 0;
      for (const t of terms) {
        const f = tf.get(t);
        if (!f) continue;
        score += (idf.get(t) ?? 0) * ((f * (K1 + 1)) / (f + K1 * (1 - B + (B * length) / avgLength)));
      }
      return { item, score };
    })
    .filter((h) => h.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
