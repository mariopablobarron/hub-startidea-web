import { Octokit } from "@octokit/rest";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "../../_components/Field";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ date?: string }>;
};

async function fetchConv(id: string, date: string) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return null;
  const owner = process.env.GITHUB_OWNER || "mariopablobarron";
  const repo = process.env.GITHUB_REPO || "hub-startidea-web";
  const branch = process.env.GITHUB_BRANCH || "main";
  const octokit = new Octokit({ auth: token });

  try {
    const res = await octokit.repos.getContent({
      owner, repo, ref: branch, path: `data/conversations/${date}/${id}.json`,
    });
    if (Array.isArray(res.data) || res.data.type !== "file") return null;
    const buf = Buffer.from(res.data.content, "base64");
    return JSON.parse(buf.toString("utf-8")) as {
      id: string;
      fingerprint: string;
      startedAt: string;
      lastMessageAt: string;
      messages: Array<{ role: string; content: string; timestamp: string }>;
      totalUsage?: { promptTokens: number; completionTokens: number };
    };
  } catch {
    return null;
  }
}

export default async function ConvDetail({ params, searchParams }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  const { id } = await params;
  const { date } = await searchParams;
  if (!date) notFound();
  const conv = await fetchConv(id, date);
  if (!conv) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Conversación ${id.slice(0, 8)}`}
        back={{ href: "/admin/conversaciones", label: "Conversaciones" }}
        description={`Iniciada ${new Date(conv.startedAt).toLocaleString("es-ES")} · ${conv.messages.length} mensajes · ${conv.totalUsage?.promptTokens ?? 0}+${conv.totalUsage?.completionTokens ?? 0} tokens`}
      />
      <section className="space-y-3 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-6">
        {conv.messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div className={
              m.role === "user"
                ? "max-w-[80%] rounded-2xl rounded-br-sm bg-[var(--color-ink)] px-4 py-2.5 text-sm text-[var(--color-paper)]"
                : "max-w-[80%] rounded-2xl rounded-bl-sm bg-[var(--color-paper-2)] px-4 py-2.5 text-sm whitespace-pre-wrap"
            }>
              {m.content}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
