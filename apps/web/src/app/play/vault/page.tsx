import { DeskShell } from "@/components/DeskShell";
import { VaultTable } from "@/components/VaultTable";

export default function VaultPage() {
  return (
    <DeskShell
      kicker="one seal · utc day"
      title="CALL THE VAULT"
      blurb="Skip, buy, or big print. We hide the 24h until the vault cracks. When the buy log is live, it will settle on that instead."
    >
      <VaultTable />
    </DeskShell>
  );
}
