// Lost-and-found matching. Compares a new report with open reports of the opposite type
// using word overlap on title + description, with a bonus for the same place.
// This is keyword similarity, not an embedding model; it is deterministic and needs no API key.

const STOPWORDS = new Set([
  'the', 'and', 'with', 'was', 'were', 'has', 'have', 'had', 'for', 'from', 'that', 'this', 'near', 'left', 'lost', 'found',
  'item', 'please', 'today', 'yesterday', 'around', 'inside', 'some', 'someone', 'somewhere', 'mine', 'your', 'into', 'its',
  'are', 'not', 'but', 'any', 'one', 'kept', 'while', 'during', 'after', 'before', 'there', 'here', 'contact'
]);

export function tokens(text) {
  return new Set(
    String(text || '')
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length >= 3 && !STOPWORDS.has(word))
      .map((word) => (word.length > 4 && word.endsWith('s') ? word.slice(0, -1) : word))
  );
}

function overlap(a, b) {
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const word of a) if (b.has(word)) shared += 1;
  return shared / (a.size + b.size - shared); // Jaccard
}

export const MATCH_THRESHOLD = 0.3;

/** Similarity between two reports, 0..1. Each has { title, description, location, location_id }. */
export function similarity(a, b) {
  const text = overlap(tokens(`${a.title} ${a.description}`), tokens(`${b.title} ${b.description}`));
  const title = overlap(tokens(a.title), tokens(b.title));
  const samePlace =
    (a.location_id && a.location_id === b.location_id) || overlap(tokens(a.location), tokens(b.location)) > 0;
  // The item itself must be alike; place alone never produces a match.
  if (text === 0) return 0;
  return Math.min(1, 0.5 * text + 0.3 * title + (samePlace ? 0.2 : 0));
}
