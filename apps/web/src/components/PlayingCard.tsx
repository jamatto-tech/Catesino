const SUIT_GLYPH: Record<string, string> = {
  S: "♠",
  H: "♥",
  D: "♦",
  C: "♣",
};

const RANK_LABEL: Record<string, string> = {
  A: "A",
  T: "10",
  J: "J",
  Q: "Q",
  K: "K",
};

type Props = {
  code: string;
  index?: number;
};

/** SVG-ish CSS card face from rank+suit code (e.g. AS, TH, 9D). */
export function PlayingCard({ code, index = 0 }: Props) {
  if (code === "??") {
    return (
      <div
        className="card back"
        style={{ animationDelay: `${index * 45}ms` }}
        aria-label="Hidden card"
      >
        <span className="card__mono">C</span>
      </div>
    );
  }

  const rank = code.slice(0, -1);
  const suit = code.slice(-1);
  const red = suit === "H" || suit === "D";
  const label = RANK_LABEL[rank] ?? rank;
  const glyph = SUIT_GLYPH[suit] ?? suit;

  return (
    <div
      className={red ? "card red" : "card"}
      style={{ animationDelay: `${index * 45}ms` }}
      aria-label={`${label} of ${suit}`}
    >
      <span className="card__rank">
        {label}
        <br />
        <span style={{ fontSize: "0.85em" }}>{glyph}</span>
      </span>
      <span className="card__suit">{glyph}</span>
      <span className="card__rank-br">
        {label}
        <br />
        <span style={{ fontSize: "0.85em" }}>{glyph}</span>
      </span>
    </div>
  );
}
