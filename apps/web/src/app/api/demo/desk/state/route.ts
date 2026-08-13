import { getServerConfig } from "@/lib/server-config";
import { jsonOk } from "@/lib/http";
import { loadTickedDesk, publicDesk } from "@/lib/desk-api";

export const runtime = "nodejs";

export async function GET() {
  const { config } = getServerConfig();
  const { state, tape, ride } = await loadTickedDesk(config);
  return jsonOk({
    desk: publicDesk(state),
    tape,
    ride: ride && !ride.already ? ride : null,
  });
}
