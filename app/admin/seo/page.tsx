import { ExternalLink, RefreshCw, AlertCircle } from "lucide-react";
import { auth } from "@/auth";
import { fetchSummary, fetchTopRows, listSitemaps, getSiteUrl, type GscRow } from "@/lib/seo/gsc";
import { PageHeader } from "../_components/Field";

// Página server-side. Cada visita dispara fetch a GSC API. Como no hay
// BD, no cacheamos en servidor — la frecuencia de uso es baja (admin
// puntual, no producción). Si crece el uso, añadir cache con revalidate.

export const dynamic = "force-dynamic";
export const metadata = { title: "SEO · Admin · HUB Startidea" };

type LoadResult =
  | {
      ok: true;
      summary28: Awaited<ReturnType<typeof fetchSummary>>;
      summary7: Awaited<ReturnType<typeof fetchSummary>>;
      topQueries: GscRow[];
      topPages: GscRow[];
      topCountries: GscRow[];
      sitemaps: Awaited<ReturnType<typeof listSitemaps>>;
    }
  | { ok: false; error: string };

async function load(): Promise<LoadResult> {
  try {
    const [summary28, summary7, topQueries, topPages, topCountries, sitemaps] = await Promise.all([
      fetchSummary(28),
      fetchSummary(7),
      fetchTopRows({ days: 28, dimension: "query", limit: 30 }),
      fetchTopRows({ days: 28, dimension: "page", limit: 20 }),
      fetchTopRows({ days: 28, dimension: "country", limit: 10 }),
      listSitemaps(),
    ]);
    return { ok: true, summary28, summary7, topQueries, topPages, topCountries, sitemaps };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error desconocido" };
  }
}

export default async function AdminSeoPage() {
  const session = await auth();
  if (!session?.user) return null;

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

          <div className="flex items-center gap-2 text-xs text-[var(--color-mute)]">
            <RefreshCw size={12} />
            Datos en vivo. Cada visita a esta página llama a la API de Search Console.
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

function SitemapsCard({ sitemaps }: { sitemaps: Awaited<ReturnType<typeof listSitemaps>> }) {
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
