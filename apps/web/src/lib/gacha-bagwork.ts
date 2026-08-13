import { DEFAULT_CATE_MINT } from "@/lib/cate-links";

const STATUS_RE =
  /(?:x\.com|twitter\.com)\/(?:[A-Za-z0-9_]+\/status|i\/web\/status)\/(\d{2,20})/i;

const BAGWORK_MARKERS = [
  "$cate",
  "catesino",
  "cate.meme",
  DEFAULT_CATE_MINT.toLowerCase(),
];

export function parseTweetUrl(raw: string): { url: string; tweetId: string } | null {
  const trimmed = raw.trim();
  const match = trimmed.match(STATUS_RE);
  if (!match) return null;
  const tweetId = match[1];
  return {
    url: `https://x.com/i/web/status/${tweetId}`,
    tweetId,
  };
}

export function tweetMentionsCate(text: string): boolean {
  const hay = text.toLowerCase();
  return BAGWORK_MARKERS.some((mark) => hay.includes(mark));
}

export function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export async function fetchTweetText(
  statusUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const oembed = `https://publish.twitter.com/oembed?omit_script=true&url=${encodeURIComponent(statusUrl)}`;
  const res = await fetchImpl(oembed, { headers: { accept: "application/json" } });
  if (!res.ok) {
    throw new Error("could not read that post — is it public?");
  }
  const data = (await res.json()) as { html?: string };
  if (!data.html) throw new Error("that post has no text we can read");
  return stripHtml(data.html);
}

export function bagworkIntentUrl(): string {
  const text = "working the $CATE bag 🧶 https://cate.meme";
  return `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`;
}
