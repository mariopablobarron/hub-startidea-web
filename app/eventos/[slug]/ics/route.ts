import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { content } from "@/lib/content";

/**
 * Endpoint .ics conforme RFC 5545 — descargable o añadible a cualquier
 * cliente de calendario (Google, Apple, Outlook, etc.).
 *
 * Cacheable un día en CDN; el evento no cambia tan a menudo.
 */

export const runtime = "nodejs";

function fmtICalDate(d: Date): string {
  // 20260520T173000Z
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeIcal(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await prisma.event.findUnique({ where: { slug } });
  if (!event || !event.published) {
    return NextResponse.json({ error: "not-found" }, { status: 404 });
  }

  const site = content.site;
  const room = event.roomSlug ? content.rooms.find((r) => r.slug === event.roomSlug) : null;
  const location = room
    ? `${room.name} — ${site.address.street}, ${site.address.postal} ${site.address.city}`
    : event.externalLocation || `${site.address.street}, ${site.address.city}`;

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Startidea//HUB Granada//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.id}@hubstartidea.es`,
    `DTSTAMP:${fmtICalDate(new Date())}`,
    `DTSTART:${fmtICalDate(event.startsAt)}`,
    `DTEND:${fmtICalDate(event.endsAt)}`,
    `SUMMARY:${escapeIcal(event.title)}`,
    `DESCRIPTION:${escapeIcal(event.description.slice(0, 1000))}`,
    `LOCATION:${escapeIcal(location)}`,
    `URL:${site.url}/eventos/${event.slug}`,
    `ORGANIZER;CN=${site.parent.name}:mailto:${site.email}`,
    "STATUS:CONFIRMED",
    "TRANSP:OPAQUE",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return new NextResponse(ics, {
    status: 200,
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `attachment; filename="${event.slug}.ics"`,
      "cache-control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
