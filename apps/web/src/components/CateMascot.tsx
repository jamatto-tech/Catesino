type Pose = "coin" | "peek" | "watch" | "seal";
type Mood = "idle" | "wick" | "bait" | "win" | "lose" | "seal" | "up" | "down";

const SRC: Record<Pose, string> = {
  coin: "/memes/cate-launch.jpg",
  peek: "/machine/nfts/the-mark.jpg",
  watch: "/machine/nfts/the-mark.jpg",
  seal: "/machine/nfts/the-mark.jpg",
};

export function CateMascot({
  pose = "watch",
  mood = "idle",
  className = "",
}: {
  pose?: Pose;
  mood?: Mood;
  className?: string;
}) {
  return (
    <span
      className={`cate-mascot cate-mascot--${pose} cate-mascot--${mood} ${className}`.trim()}
      aria-hidden
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={SRC[pose]} alt="" />
    </span>
  );
}
