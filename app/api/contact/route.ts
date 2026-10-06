import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Envoi direct indisponible sur cette version." },
    { status: 503 },
  );
}
