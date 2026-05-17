import { Octokit } from "@octokit/rest";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/roles";
import { PageHeader } from "../_components/Field";
import { ArrowRight, MessageSquare } from "lucide-react";

export const dynamic = "force-dynamic";

type Conv = {
  path: string;
  name: string;
  date: string;
};

async function listConversations(): Promise<Conv[]> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return [];
  const owner = process.env.GITHUB_OWNER || "mariopablobarron";
  const repo = process.env.GITHUB_REPO || "hub-startidea-web";
  const branch = process.env.GITHUB_BRANCH || "main";
  const octokit = new Octokit({ auth: token });

  // Lista carpetas data/conversations/YYYY-MM-DD/
  try {
    const root = await octokit.repos.getContent({ owner, repo, path: "data/conversations", ref: branch });
    if (!Array.isArray(root.data)) return [];
    const dates = root.data.filter((d) => d.type === "dir").map((d) => d.name).sort().reverse().slice(0, 14);
    const out: Conv[] = [];
    for (const date of dates) {
      const day = await octokit.repos.getContent({ owner, repo, path: `data/conversations/${date}`, ref: branch });
      if (Array.isArray(day.data)) {
        for (const f of day.data) {
          if (f.type === "file" && f.name.endsWith(".json")) {
            out.push({ path: f.path, name: f.name.replace(".json", ""), date });
          }
        }
      }
    }
    return out.slice(0, 100);
  } catch (e) {
    if ((e as { status?: number }).status === 404) return [];
    throw e;
  }
}

export default async function ConversacionesAdmin() {
  await requireAdmin();

  const convs = await listConversations();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Conversaciones del chatbot"
        back={{ href: "/admin", label: "Dashboard" }}
        description="Últimas 100 conversaciones del bot público. Útil para ver qué te preguntan y detectar lagunas en el FAQ."
      />

      {convs.length === 0 ? (
        <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-10 text-center">
          <MessageSquare size={32} className="mx-auto text-[var(--color-mute)]" />
          <p className="mt-4 text-sm text-[var(--color-mute)]">
            Aún no hay conversaciones. Las primeras aparecerán aquí cuando alguien use el chat.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {convs.map((c) => (
            <Link
              key={c.path}
              href={`/admin/conversaciones/${c.name}?date=${c.date}`}
              className="flex items-center justify-between gap-4 rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)] px-4 py-3 transition hover:border-[var(--color-ink)]"
            >
              <div>
                <div className="font-mono text-sm">{c.name.slice(0, 8)}</div>
                <div className="text-xs text-[var(--color-mute)]">{c.date}</div>
              </div>
              <ArrowRight size={14} className="text-[var(--color-mute)]" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
