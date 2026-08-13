import { DeskShell } from "@/components/DeskShell";
import { CateDeskTable } from "@/components/CateDeskTable";

export default function DeskPage() {
  return (
    <DeskShell
      kicker="twenty seconds · one chart"
      title="THE CATE DESK"
      blurb="Paper long or short live $CATE. Ride the tape for twenty seconds. Score, not cash. Not a broker."
    >
      <CateDeskTable />
    </DeskShell>
  );
}
