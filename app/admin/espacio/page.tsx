import { Gamepad2, ExternalLink } from "lucide-react";
import { requireAdmin } from "@/lib/auth/roles";
import { virtualSpace } from "@/lib/content";
import { updateVirtualSpace } from "@/lib/admin/actions";
import { Field, Input, Textarea, SaveBar, PageHeader, FlashBanner } from "../_components/Field";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ saved?: string; error?: string }> };

export default async function AdminEspacioPage({ searchParams }: Props) {
  await requireAdmin();
  const sp = await searchParams;
  const vs = virtualSpace;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Espacio virtual"
        back={{ href: "/admin", label: "Dashboard" }}
        description="Conecta un espacio tipo SpatialChat/Gather (videojuego 2D + salas + vídeo por proximidad). Tú creas el espacio en la plataforma y aquí pegas el enlace."
      />
      <FlashBanner saved={sp.saved === "1"} error={sp.error} />

      {/* Guía de creación */}
      <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper-2)] p-6 text-sm leading-relaxed">
        <h2 className="flex items-center gap-2 font-display text-base">
          <Gamepad2 size={18} className="text-[var(--color-coral-600)]" /> Cómo crear el espacio (5 min)
        </h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-[var(--color-mute)]">
          <li>
            Entra a{" "}
            <a href="https://app.gather.town" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline">
              app.gather.town <ExternalLink size={11} />
            </a>{" "}
            (gratis hasta 10 personas a la vez — perfecto para empezar). Alternativas:
            SpatialChat o WorkAdventure.
          </li>
          <li>Crea un espacio nuevo eligiendo una plantilla de oficina/coworking (estilo videojuego 2D).</li>
          <li>Copia la <strong>URL pública</strong> del espacio (algo como <code className="rounded bg-white px-1">https://app.gather.town/app/XXXX/HUB-Startidea</code>).</li>
          <li>Pégala abajo, marca <strong>&ldquo;Activado&rdquo;</strong> y guarda. Aparecerá en <code className="rounded bg-white px-1">/espacio</code>.</li>
        </ol>
        <p className="mt-3 text-xs">
          Nota: algunas plataformas no permiten el vídeo dentro de un iframe. Por eso la
          página siempre ofrece un botón &ldquo;Abrir a pantalla completa&rdquo; que funciona seguro.
        </p>
      </div>

      <form action={updateVirtualSpace} className="space-y-4 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-6">
        <Field label="URL del espacio" hint="El enlace público de Gather/SpatialChat/WorkAdventure.">
          <Input name="url" type="url" defaultValue={vs.url} placeholder="https://app.gather.town/app/.../HUB-Startidea" />
        </Field>

        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Plataforma" hint="Solo informativo.">
            <select
              name="provider"
              defaultValue={vs.provider}
              className="mt-1 block w-full rounded-xl border border-[var(--color-line)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-ink)]"
            >
              <option value="">—</option>
              <option value="gather">Gather</option>
              <option value="spatialchat">SpatialChat</option>
              <option value="workadventure">WorkAdventure</option>
            </select>
          </Field>
          <Field label="Título (cabecera de /espacio)">
            <Input name="title" defaultValue={vs.title} placeholder="Espacio virtual del HUB" />
          </Field>
        </div>

        <Field label="Descripción">
          <Textarea name="description" rows={2} defaultValue={vs.description} />
        </Field>

        <div className="space-y-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-paper-2)] p-4 text-sm">
          <label className="flex items-start gap-3">
            <input type="checkbox" name="enabled" defaultChecked={vs.enabled} className="mt-0.5 h-4 w-4" />
            <span>
              <span className="font-medium text-[var(--color-ink)]">Activado</span>
              <span className="mt-0.5 block text-xs text-[var(--color-mute)]">Si no, /espacio muestra &ldquo;en preparación&rdquo;.</span>
            </span>
          </label>
          <label className="flex items-start gap-3">
            <input type="checkbox" name="requireLogin" defaultChecked={vs.requireLogin} className="mt-0.5 h-4 w-4" />
            <span>
              <span className="font-medium text-[var(--color-ink)]">Solo miembros con sesión</span>
              <span className="mt-0.5 block text-xs text-[var(--color-mute)]">Recomendado: evita que entren anónimos al espacio.</span>
            </span>
          </label>
          <label className="flex items-start gap-3">
            <input type="checkbox" name="embed" defaultChecked={vs.embed} className="mt-0.5 h-4 w-4" />
            <span>
              <span className="font-medium text-[var(--color-ink)]">Embeber en la web (iframe)</span>
              <span className="mt-0.5 block text-xs text-[var(--color-mute)]">Si la plataforma lo bloquea, desmárcalo y se mostrará solo el botón de abrir.</span>
            </span>
          </label>
        </div>

        <SaveBar />
      </form>
    </div>
  );
}
