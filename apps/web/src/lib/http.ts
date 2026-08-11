import { NextResponse } from "next/server";

export function jsonOk(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function jsonError(
  error: string,
  status = 400,
  extra?: Record<string, unknown>,
) {
  return NextResponse.json({ error, ...extra }, { status });
}

export function errorFromUnknown(e: unknown): NextResponse {
  const status =
    typeof e === "object" &&
    e !== null &&
    "status" in e &&
    typeof (e as { status: unknown }).status === "number"
      ? (e as { status: number }).status
      : 500;
  const message = e instanceof Error ? e.message : String(e);
  return jsonError(message, status);
}
