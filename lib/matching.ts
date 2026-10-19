export type MatchItem = {
  item_name: string; description?: string | null; category_id: number;
  location_id: number; campus_id: number; color?: string | null;
  brand?: string | null; datetime: string; tags?: string[];
  search_keywords?: string[];
};
export const RULE_WEIGHTS = { category: .25, name: .20, description: .10, color: .10, brand: .10, location: .10, time: .05, tags: .10 };
export const MATCH_THRESHOLD = .55;
const normalize = (s?: string | null) => (s ?? "").toLowerCase().trim().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const tokens = (s?: string | null) => new Set(normalize(s).split(" ").filter(Boolean));
function overlap(a: Set<string>, b: Set<string>) {
  if (!a.size || !b.size) return 0;
  const intersection = [...a].filter(t => b.has(t)).length;
  return intersection / new Set([...a, ...b]).size;
}
function equalKnown(a?: string | null, b?: string | null) { return normalize(a) && normalize(a) === normalize(b) ? 1 : 0; }
function utc(s: string) { return Date.parse(s.replace(" ", "T") + (/[zZ]|[+-]\d{2}:\d{2}$/.test(s) ? "" : "Z")); }
export function compareItems(lost: MatchItem, found: MatchItem) {
  const hours = (utc(found.datetime) - utc(lost.datetime)) / 3_600_000;
  const eligible = lost.category_id === found.category_id && lost.campus_id === found.campus_id &&
    Number.isFinite(hours) && hours >= -1/12 && hours <= 14 * 24;
  const aTags = new Set([...(lost.tags ?? []), ...(lost.search_keywords ?? [])].map(normalize).filter(Boolean));
  const bTags = new Set([...(found.tags ?? []), ...(found.search_keywords ?? [])].map(normalize).filter(Boolean));
  const ruleScores = {
    category: lost.category_id === found.category_id ? 1 : 0,
    name: overlap(tokens(lost.item_name), tokens(found.item_name)),
    description: overlap(tokens(lost.description), tokens(found.description)),
    color: equalKnown(lost.color, found.color), brand: equalKnown(lost.brand, found.brand),
    location: lost.location_id === found.location_id ? 1 : 0,
    time: Number.isFinite(hours) && hours >= -1/12 ? Math.max(0, 1 - Math.max(0, hours) / (14 * 24)) : 0,
    tags: overlap(aTags, bTags)
  };
  const score = eligible ? Number(Object.entries(RULE_WEIGHTS).reduce((s, [key, weight]) => s + weight * ruleScores[key as keyof typeof ruleScores], 0).toFixed(6)) : 0;
  const matchedTags = [...aTags].filter(t => bTags.has(t));
  return {
    eligible, score, ruleScores, matchedTags,
    explanation: eligible ? "Weighted comparison of category, name, description, color, brand, location, time and MongoDB tags. Missing attributes score zero. Staff must verify ownership." : "Different category/campus or dates outside the 14 day window."
  };
}
