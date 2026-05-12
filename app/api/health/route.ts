import { NextResponse } from "next/server";

// Health endpoint público — usado por cron-job.org, UptimeRobot y schedule MCP
// para detectar caídas. Devuelve 200 + JSON ligero si la app responde.
// No toca BD ni servicios externos: el objetivo es saber si Next responde,
// no si todo el stack está sano (eso ya lo cubre el deploy en sí).

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      service: "hub-startidea-web",
      ts: new Date().toISOString(),
      // commit hash inyectado en build (si Coolify lo expone) o "unknown"
      commit: process.env.COMMIT_SHA?.slice(0, 7) || process.env.NEXT_PUBLIC_COMMIT_SHA?.slice(0, 7) || "unknown",
    },
    {
      status: 200,
      headers: {
        "cache-control": "no-store, no-cache, must-revalidate",
      },
    },
  );
}

export async function HEAD() {
  // Algunos monitores usan HEAD para no transferir body.
  return new Response(null, {
    status: 200,
    headers: { "cache-control": "no-store" },
  });
}
