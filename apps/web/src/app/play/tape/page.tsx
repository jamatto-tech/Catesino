import { DeskShell } from "@/components/DeskShell";
import { TapeTable } from "@/components/TapeTable";

export default function TapePage() {
  return (
    <DeskShell
      kicker="published 50/50"
      title="TAPE FLIP"
      blurb="Call the fake candle. It prints 50/50. Chase a streak. Not alpha. Not a broker."
    >
      <TapeTable />
    </DeskShell>
  );
}
