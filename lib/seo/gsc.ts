import { unstable_cache } from "next/cache";
import { google } from "googleapis";

// Cliente Google Search Console (Webmasters v3).
// Las credenciales OAuth se reutilizan del refresh token de Mario (mismo
// usuario que tiene acceso a múltiples propiedades), por lo que con un
// único refresh_token podemos llamar a la API para cualquier site que
// el usuario tenga en su GSC.

function getClient() {
  const clientId = process.env.GSC_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GSC_OAUTH_CLIENT_SECRET;
  const refreshToken = process.env.GSC_OAUTH_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "GSC OAuth env vars no configuradas (GSC_OAUTH_CLIENT_ID, _CLIENT_SECRET, _REFRESH_TOKEN)",
    );
  }
  const oauth2 = new google.auth.OAuth2(clientId, clientSecret);
  oauth2.setCredentials({ refresh_token: refreshToken });
  return google.searchconsole({ version: "v1", auth: oauth2 });
}

export function getSiteUrl(): string {
  return process.env.GSC_SITE_URL || "sc-domain:hubstartidea.es";
}

export type GscRow = {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

/**
 * Trae stats agregadas en una ventana de N días, agrupadas por una dimensión.
 * - dimension="query"   → top búsquedas
 * - dimension="page"    → top páginas
 * - dimension="country" → top países
 */
export async function fetchTopRows(opts: {
  days: number;
  dimension: "query" | "page" | "country" | "device";
  limit?: number;
}): Promise<GscRow[]> {
  const client = getClient();
  const siteUrl = getSiteUrl();
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(end.getUTCDate() - opts.days);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  const { data } = await client.searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate: fmt(start),
      endDate: fmt(end),
      dimensions: [opts.dimension],
      rowLimit: opts.limit ?? 25,
      // Sin filtros: cifras totales del site para ese rango.
    },
  });

  return (data.rows || []).map((r) => ({
    keys: r.keys || [],
    clicks: r.clicks || 0,
    impressions: r.impressions || 0,
    ctr: r.ctr || 0,
    position: r.position || 0,
  }));
}

/** Resumen agregado (totales) del periodo. */
export async function fetchSummary(days: number): Promise<{
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}> {
  const client = getClient();
  const siteUrl = getSiteUrl();
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(end.getUTCDate() - days);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  const { data } = await client.searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate: fmt(start),
      endDate: fmt(end),
      // Sin dimensions = totales globales del site.
      rowLimit: 1,
    },
  });

  const row = data.rows?.[0];
  return {
    clicks: row?.clicks || 0,
    impressions: row?.impressions || 0,
    ctr: row?.ctr || 0,
    position: row?.position || 0,
  };
}

/** Lista de sitemaps registrados en GSC para el site. */
export async function listSitemaps() {
  const client = getClient();
  const siteUrl = getSiteUrl();
  const { data } = await client.sitemaps.list({ siteUrl });
  return data.sitemap || [];
}

export type DailyRow = {
  date: string; // ISO yyyy-mm-dd
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

/** Trae stats día a día (dimension=date). Sirve para gráficas de tendencia. */
export async function fetchDailyTrend(days: number): Promise<DailyRow[]> {
  const client = getClient();
  const siteUrl = getSiteUrl();
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(end.getUTCDate() - days);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  const { data } = await client.searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate: fmt(start),
      endDate: fmt(end),
      dimensions: ["date"],
      rowLimit: days + 10,
    },
  });

  return (data.rows || [])
    .map((r) => ({
      date: r.keys?.[0] || "",
      clicks: r.clicks || 0,
      impressions: r.impressions || 0,
      ctr: r.ctr || 0,
      position: r.position || 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export type WeeklyRow = {
  week: string; // yyyy-Www (ISO week)
  weekStart: string; // yyyy-mm-dd primer día (lunes)
  clicks: number;
  impressions: number;
  ctr: number; // ponderado por impresiones
  position: number; // ponderado por impresiones
};

function isoWeekNumber(d: Date): number {
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNr = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setUTCMonth(0, 1);
  if (target.getUTCDay() !== 4) {
    target.setUTCMonth(0, 1 + ((4 - target.getUTCDay() + 7) % 7));
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604_800_000);
}

function isoWeekYear(d: Date): number {
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNr = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  return target.getUTCFullYear();
}

function mondayOfWeek(d: Date): Date {
  const out = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNr = (out.getUTCDay() + 6) % 7;
  out.setUTCDate(out.getUTCDate() - dayNr);
  return out;
}

/** Agrega filas diarias por semana ISO. CTR y posición se ponderan por impresiones. */
export function groupByIsoWeek(rows: DailyRow[]): WeeklyRow[] {
  type Acc = {
    clicks: number;
    impressions: number;
    ctrNum: number; // suma ctr * impressions
    posNum: number; // suma position * impressions
    weekStart: string;
  };
  const buckets = new Map<string, Acc>();
  for (const r of rows) {
    const d = new Date(`${r.date}T00:00:00Z`);
    if (Number.isNaN(d.getTime())) continue;
    const key = `${isoWeekYear(d)}-W${String(isoWeekNumber(d)).padStart(2, "0")}`;
    const acc = buckets.get(key) || {
      clicks: 0,
      impressions: 0,
      ctrNum: 0,
      posNum: 0,
      weekStart: mondayOfWeek(d).toISOString().slice(0, 10),
    };
    acc.clicks += r.clicks;
    acc.impressions += r.impressions;
    acc.ctrNum += r.ctr * r.impressions;
    acc.posNum += r.position * r.impressions;
    buckets.set(key, acc);
  }
  return Array.from(buckets.entries())
    .map(([week, a]) => ({
      week,
      weekStart: a.weekStart,
      clicks: a.clicks,
      impressions: a.impressions,
      ctr: a.impressions > 0 ? a.ctrNum / a.impressions : 0,
      position: a.impressions > 0 ? a.posNum / a.impressions : 0,
    }))
    .sort((a, b) => a.week.localeCompare(b.week));
}

// =============================================================
// Versiones cacheadas (1 hora) para el panel admin. Evitan llamar
// a GSC en cada reload — los datos de GSC se actualizan cada 24-48h
// según Google, así que un TTL agresivo está bien.
// =============================================================
const CACHE_TTL = 3600; // 1 hora

export const fetchSummaryCached = unstable_cache(
  async (days: number) => fetchSummary(days),
  ["gsc-summary"],
  { revalidate: CACHE_TTL, tags: ["gsc"] },
);

export const fetchTopRowsCached = unstable_cache(
  async (days: number, dimension: "query" | "page" | "country" | "device", limit: number) =>
    fetchTopRows({ days, dimension, limit }),
  ["gsc-top-rows"],
  { revalidate: CACHE_TTL, tags: ["gsc"] },
);

export const listSitemapsCached = unstable_cache(
  async () => listSitemaps(),
  ["gsc-sitemaps"],
  { revalidate: CACHE_TTL, tags: ["gsc"] },
);

export const fetchWeeklyTrendCached = unstable_cache(
  async (weeks: number) => groupByIsoWeek(await fetchDailyTrend(weeks * 7)),
  ["gsc-weekly-trend"],
  { revalidate: CACHE_TTL, tags: ["gsc"] },
);
