import { DeskShell } from "@/components/DeskShell";
import { HoldTable } from "@/components/HoldTable";

export default function HoldPage() {
  return (
    <DeskShell
      kicker="don't fold"
      title="HOLD THE LINE"
      blurb="Red wick? Smash HOLD. Fake take-profit? Do nothing. Survive the wave. Score is just points — not cash."
    >
      <HoldTable />
    </DeskShell>
  );
}
