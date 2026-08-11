type Props = {
  src: string;
  alt: string;
  badge?: string;
  aspect?: "square" | "wide" | "portrait";
  className?: string;
};

/** Brand meme frame — local assets under /memes (sourced from $CATE community on X). */
export function MemeFrame({
  src,
  alt,
  badge = "$CATE",
  aspect = "wide",
  className = "",
}: Props) {
  const ratio =
    aspect === "square" ? "1 / 1" : aspect === "portrait" ? "3 / 4" : "16 / 10";

  return (
    <figure
      className={`meme-stage ${className}`.trim()}
      style={{ aspectRatio: ratio }}
    >
      {badge ? <span className="meme-stage__badge">{badge}</span> : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} loading="lazy" />
    </figure>
  );
}
