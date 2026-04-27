import { Octokit } from "@octokit/rest";

const owner = process.env.GITHUB_OWNER || "mariopablobarron";
const repo = process.env.GITHUB_REPO || "hub-startidea-web";
const branch = process.env.GITHUB_BRANCH || "main";

function octokit() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error("GITHUB_TOKEN no configurado en las env vars de Coolify");
  }
  return new Octokit({ auth: token });
}

async function getCurrentSha(path: string): Promise<string | undefined> {
  try {
    const res = await octokit().repos.getContent({ owner, repo, path, ref: branch });
    if (Array.isArray(res.data) || res.data.type !== "file") return undefined;
    return res.data.sha;
  } catch (e: unknown) {
    if ((e as { status?: number }).status === 404) return undefined;
    throw e;
  }
}

/** Crea o actualiza un archivo en GitHub. Devuelve el SHA del commit. */
export async function commitFile(opts: {
  path: string;
  content: string | Buffer;
  message: string;
  isBase64?: boolean;
}): Promise<string> {
  const sha = await getCurrentSha(opts.path);
  const body = Buffer.isBuffer(opts.content)
    ? opts.content.toString("base64")
    : opts.isBase64
      ? opts.content
      : Buffer.from(opts.content, "utf-8").toString("base64");

  const res = await octokit().repos.createOrUpdateFileContents({
    owner,
    repo,
    path: opts.path,
    branch,
    message: opts.message,
    content: body,
    sha,
    committer: {
      name: "HUB Startidea Admin",
      email: "admin@hubstartidea.es",
    },
    author: {
      name: "HUB Startidea Admin",
      email: "admin@hubstartidea.es",
    },
  });
  return res.data.commit.sha || "";
}

/** Dispara el webhook de Coolify para redeploy (configurado por env). */
export async function triggerRedeploy(): Promise<{ ok: boolean; status?: number }> {
  const url = process.env.COOLIFY_DEPLOY_WEBHOOK;
  if (!url) return { ok: false };
  try {
    const res = await fetch(url, { method: "GET", cache: "no-store" });
    return { ok: res.ok, status: res.status };
  } catch {
    return { ok: false };
  }
}
