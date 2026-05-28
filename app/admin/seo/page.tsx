import { ExternalLink, RefreshCw, AlertCircle } from "lucide-react";
import { revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth/roles";
import {
  fetchSummaryCached,
  fetchTopRowsCached,
  fetchWeeklyTrendCached,
  listSitemapsCached,
  getSiteUrl,
  type GscRow,
  type WeeklyRow,
} from "@/lib/seo/gsc";
import { PageHeader } from "../_components/Field";

// Página server-side con cache 1h (TTL en lib/seo/gsc.ts). La API de GSC
// se actualiza cada 24-48h según Google, así que cachear 1h no pierde
// frescura útil y evita rate limits si alguien recarga la página.
// Para forzar refresh manual, action "refresh-cache" abajo.

export const dynamic = "force-dynamic";
export const metadata = { title: "SEO · Admin · HUB Startidea" };

async function refreshCache() {
  "use server";
  revalidateTag("gsc");
}

type LoadResult =
  | {
      ok: true;
      summary28: Awaited<ReturnType<typeof fetchSummaryCached>>;
      summary7: Awaited<ReturnType<typeof fetchSummaryCached>>;
      topQueries: GscRow[];
      topPages: GscRow[];
      topCountries: GscRow[];
      sitemaps: Awaited<ReturnType<typeof listSitemapsCached>>;
      weeklyTrend: WeeklyRow[];
    }
  | { ok: false; error: string };

async function load(): Promise<LoadResult> {
  try {
    const [summary28, summary7, topQueries, topPages, topCountries, sitemaps, weeklyTrend] =
      await Promise.all([
        fetchSummaryCached(28),
        fetchSummaryCached(7),
        fetchTopRowsCached(28, "query", 30),
        fetchTopRowsCached(28, "page", 20),
        fetchTopRowsCached(28, "country", 10),
        listSitemapsCached(),
        fetchWeeklyTrendCached(12),
      ]);
    return {
      ok: true,
      summary28,
      summary7,
      topQueries,
      topPages,
      topCountries,
      sitemaps,
      weeklyTrend,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error desconocido" };
  }
}

export default async function AdminSeoPage() {
  await requireAdmin();

  const data = await load();
  const siteUrl = getSiteUrl();

  return (
    <div className="space-y-6">
      <PageHeader title="SEO · Search Console" description={`Propiedad: ${siteUrl}`} />

      {!data.ok ? (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-900"
        >
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <div>
            <div className="font-medium">No se pudo cargar Search Console</div>
            <div className="mt-1 text-red-800/80">{data.error}</div>
            <div className="mt-2 text-xs text-red-800/70">
              Probable causa: env vars `GSC_OAUTH_*` no configuradas en Coolify, o el refresh
              token expiró. Las credenciales viven en Coolify BD (compartidas con luciérnaga).
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Resumen 28d vs 7d */}
          <section className="grid gap-4 md:grid-cols-2">
            <SummaryCard
              title="Últimos 28 días"
              data={data.summary28}
              caption="Ventana estándar de GSC"
            />
            <SummaryCard
              title="Últimos 7 días"
              data={data.summary7}
              caption="Tendencia reciente"
            />
          </section>

          {/* Tendencia 12 semanas */}
          <TrendCard rows={data.weeklyTrend} />

          {/* Top queries + Top pages */}
          <section className="grid gap-4 lg:grid-cols-2">
            <RowsTable
              title="Top búsquedas (28d)"
              rows={data.topQueries}
              keyHeader="Query"
              emptyMessage="Aún no hay datos. Google empieza a recoger queries 24-72h después de la primera indexación."
            />
            <RowsTable
              title="Top páginas (28d)"
              rows={data.topPages}
              keyHeader="Página"
              renderKey={(k) => (
                <a
                  href={k}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1 hover:text-[var(--color-coral-600)]"
                >
                  {shortPath(k)}
                  <ExternalLink size={12} />
                </a>
              )}
              emptyMessage="Aún no hay páginas con impresiones."
            />
          </section>

          {/* Top países + Sitemaps */}
          <section className="grid gap-4 lg:grid-cols-2">
            <RowsTable
              title="Top países (28d)"
              rows={data.topCountries}
              keyHeader="País"
              renderKey={(k) => <span className="uppercase">{k}</span>}
              emptyMessage="—"
            />
            <SitemapsCard sitemaps={data.sitemaps} />
          </section>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)] px-4 py-3 text-xs">
            <div className="flex items-center gap-2 text-[var(--color-mute)]">
              <RefreshCw size={12} />
              Datos cacheados 1 hora. GSC actualiza una vez al día, por lo que cachear no pierde frescura útil.
            </div>
            <form action={refreshCache}>
              <button
                type="submit"
                className="rounded-full border border-[var(--color-line)] px-3 py-1 text-xs hover:border-[var(--color-ink)] hover:bg-[var(--color-paper-2)]"
              >
                Forzar refresh
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}

function SummaryCard({
  title,
  data,
  caption,
}: {
  title: string;
  data: { clicks: number; impressions: number; ctr: number; position: number };
  caption: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-6">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-lg">{title}</h2>
        <span className="text-xs text-[var(--color-mute)]">{caption}</span>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-y-4 md:grid-cols-4">
        <Stat label="Clicks" value={fmtInt(data.clicks)} />
        <Stat label="Impresiones" value={fmtInt(data.impressions)} />
        <Stat label="CTR" value={fmtPct(data.ctr)} />
        <Stat label="Posición" value={fmtPos(data.position)} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-[0.16em] text-[var(--color-mute)]">{label}</div>
      <div className="mt-1 font-display text-2xl tracking-tight">{value}</div>
    </div>
  );
}

function RowsTable({
  title,
  rows,
  keyHeader,
  renderKey,
  emptyMessage,
}: {
  title: string;
  rows: GscRow[];
  keyHeader: string;
  renderKey?: (k: string) => React.ReactNode;
  emptyMessage: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-6">
      <h2 className="font-display text-lg">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--color-mute)]">{emptyMessage}</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-[0.12em] text-[var(--color-mute)]">
              <tr className="border-b border-[var(--color-line)]">
                <th className="py-2 text-left font-medium">{keyHeader}</th>
                <th className="px-2 py-2 text-right font-medium">Clicks</th>
                <th className="px-2 py-2 text-right font-medium">Imp.</th>
                <th className="px-2 py-2 text-right font-medium">CTR</th>
                <th className="py-2 pl-2 text-right font-medium">Pos</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-[var(--color-line)]/60 last:border-0">
                  <td className="max-w-[280px] truncate py-2 pr-2">
                    {renderKey ? renderKey(r.keys[0] || "") : r.keys[0]}
                  </td>
                  <td className="px-2 py-2 text-right font-medium">{r.clicks}</td>
                  <td className="px-2 py-2 text-right text-[var(--color-mute)]">{r.impressions}</td>
                  <td className="px-2 py-2 text-right text-[var(--color-mute)]">{fmtPct(r.ctr)}</td>
                  <td className="py-2 pl-2 text-right text-[var(--color-mute)]">{fmtPos(r.position)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SitemapsCard({ sitemaps }: { sitemaps: Awaited<ReturnType<typeof listSitemapsCached>> }) {
  return (
    <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-6">
      <h2 className="font-display text-lg">Sitemaps</h2>
      {sitemaps.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--color-mute)]">
          No hay sitemaps registrados en GSC todavía.
        </p>
      ) : (
        <ul className="mt-4 space-y-3 text-sm">
          {sitemaps.map((s) => {
            const errors = Number(s.errors || 0);
            const warnings = Number(s.warnings || 0);
            const lastSubmitted = s.lastSubmitted ? new Date(s.lastSubmitted) : null;
            return (
              <li key={s.path} className="rounded-lg border border-[var(--color-line)] p-3">
                <div className="flex items-center justify-between gap-3">
                  <a
                    href={s.path || "#"}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1 truncate font-medium hover:text-[var(--color-coral-600)]"
                  >
                    {s.path?.replace(/^https?:\/\//, "")}
                    <ExternalLink size={12} className="shrink-0" />
                  </a>
                  {errors > 0 ? (
                    <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-700">
                      {errors} errores
                    </span>
                  ) : warnings > 0 ? (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
                      {warnings} avisos
                    </span>
                  ) : (
                    <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-700">
                      OK
                    </span>
                  )}
                </div>
                {lastSubmitted && (
                  <div className="mt-1 text-xs text-[var(--color-mute)]">
                    Enviado: {lastSubmitted.toLocaleDateString("es-ES")} · Tipo: {s.type || "—"}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function TrendCard({ rows }: { rows: WeeklyRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-6">
        <h2 className="font-display text-lg">Tendencia 12 semanas</h2>
        <p className="mt-3 text-sm text-[var(--color-mute)]">
          Aún no hay datos suficientes para mostrar la tendencia.
        </p>
      </div>
    );
  }

  const clicks = rows.map((r) => r.clicks);
  const impressions = rows.map((r) => r.impressions);
  const ctr = rows.map((r) => r.ctr * 100);
  const position = rows.map((r) => r.position);
  const labels = rows.map((r) => r.weekStart);

  return (
    <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-6">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-lg">Tendencia 12 semanas</h2>
        <span className="text-xs text-[var(--color-mute)]">
          {rows.length} semana{rows.length === 1 ? "" : "s"} · {labels[0]} → {labels[labels.length - 1]}
        </span>
      </div>
      <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Sparkline title="Clicks" series={clicks} format={fmtInt} />
        <Sparkline title="Impresiones" series={impressions} format={fmtInt} />
        <Sparkline title="CTR" series={ctr} format={(v) => `${v.toFixed(1)}%`} />
        <Sparkline title="Posición" series={position} format={fmtPos} betterWhen="down" />
      </div>
    </div>
  );
}

function Sparkline({
  title,
  series,
  format,
  betterWhen = "up",
}: {
  title: string;
  series: number[];
  format: (v: number) => string;
  betterWhen?: "up" | "down";
}) {
  const w = 200;
  const h = 56;
  const padding = 2;
  const last = series[series.length - 1] ?? 0;
  const first = series[0] ?? 0;
  const valid = series.filter((v) => v > 0);
  const min = valid.length ? Math.min(...valid) : 0;
  const max = valid.length ? Math.max(...valid) : 1;
  const range = max - min || 1;

  const points = series
    .map((v, i) => {
      const x = padding + (i / Math.max(series.length - 1, 1)) * (w - padding * 2);
      const y = padding + (h - padding * 2) * (1 - (v - min) / range);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  // Delta: comparar últimas 4 semanas vs 4 anteriores (más estable que primera vs última)
  const recent = series.slice(-4);
  const prior = series.slice(-8, -4);
  const recentAvg = recent.length ? recent.reduce((a, b) => a + b, 0) / recent.length : 0;
  const priorAvg = prior.length ? prior.reduce((a, b) => a + b, 0) / prior.length : 0;
  const delta = priorAvg > 0 ? ((recentAvg - priorAvg) / priorAvg) * 100 : 0;
  const isPositive = betterWhen === "up" ? delta > 0 : delta < 0;
  const noChange = Math.abs(delta) < 0.5 || (priorAvg === 0 && recentAvg === 0);

  const stroke = noChange
    ? "#94a3b8" // slate-400
    : isPositive
    ? "#047857" // emerald-700
    : "#b91c1c"; // red-700
  const deltaColor = noChange
    ? "text-slate-500"
    : isPositive
    ? "text-emerald-700"
    : "text-red-700";

  // Solo dibujar puntos visibles cuando hay <= 12 semanas (siempre cumple en este caso)
  const lastPoint = series.length > 0
    ? {
        x: padding + ((series.length - 1) / Math.max(series.length - 1, 1)) * (w - padding * 2),
        y: padding + (h - padding * 2) * (1 - (last - min) / range),
      }
    : null;

  return (
    <div>
      <div className="text-xs uppercase tracking-[0.16em] text-[var(--color-mute)]">{title}</div>
      <div className="mt-1 flex items-baseline justify-between gap-2">
        <span className="font-display text-2xl tracking-tight">{format(last)}</span>
        {!noChange && prior.length > 0 && (
          <span className={`text-xs font-medium ${deltaColor}`} title={`vs 4 sem. previas: ${format(priorAvg)}`}>
            {delta > 0 ? "+" : ""}{delta.toFixed(0)}%
          </span>
        )}
      </div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="mt-2 h-14 w-full"
        role="img"
        aria-label={`Tendencia de ${title}: ${series.map(format).join(", ")}`}
      >
        {valid.length > 0 ? (
          <>
            <polyline
              points={points}
              fill="none"
              stroke={stroke}
              strokeWidth="1.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {lastPoint && (
              <circle cx={lastPoint.x} cy={lastPoint.y} r="2.5" fill={stroke} />
            )}
          </>
        ) : (
          <text
            x={w / 2}
            y={h / 2}
            textAnchor="middle"
            fontSize="10"
            fill="var(--color-mute, #6b7280)"
          >
            sin datos
          </text>
        )}
      </svg>
    </div>
  );
}

// Helpers de formato
function fmtInt(n: number): string {
  return new Intl.NumberFormat("es-ES").format(Math.round(n));
}
function fmtPct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}
function fmtPos(n: number): string {
  return n > 0 ? n.toFixed(1) : "—";
}
function shortPath(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname === "/" ? "/" : u.pathname;
  } catch {
    return url;
  }
}
