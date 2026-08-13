import { describe, expect, it } from "vitest";
import {
  parseTweetUrl,
  stripHtml,
  tweetMentionsCate,
} from "./gacha-bagwork";

describe("parseTweetUrl", () => {
  it("accepts x.com and twitter.com status links", () => {
    expect(parseTweetUrl("https://x.com/CateonSol_/status/1234567890123456789")?.tweetId).toBe(
      "1234567890123456789",
    );
    expect(
      parseTweetUrl("https://twitter.com/someone/status/99")?.tweetId,
    ).toBe("99");
    expect(parseTweetUrl("https://x.com/i/web/status/42")?.tweetId).toBe("42");
    expect(parseTweetUrl("https://example.com/status/1")).toBeNull();
  });
});

describe("tweetMentionsCate", () => {
  it("requires a $CATE bagwork marker", () => {
    expect(tweetMentionsCate("working the $CATE bag")).toBe(true);
    expect(tweetMentionsCate("go Catesino")).toBe(true);
    expect(tweetMentionsCate("see cate.meme")).toBe(true);
    expect(tweetMentionsCate("just vibes")).toBe(false);
  });
});

describe("stripHtml", () => {
  it("pulls tweet text out of oEmbed html", () => {
    const text = stripHtml(
      '<blockquote>working the $CATE bag<br>cate.meme</blockquote>',
    );
    expect(text).toMatch(/\$CATE/);
    expect(text).toMatch(/cate.meme/);
  });
});
