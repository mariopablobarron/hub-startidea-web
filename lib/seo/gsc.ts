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
