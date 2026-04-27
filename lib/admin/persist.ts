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

/**
 * Dispara redeploy en Coolify v3 vía API REST (login programático + deploy).
 * Requiere COOLIFY_URL, COOLIFY_APP_ID, COOLIFY_EMAIL, COOLIFY_PASSWORD.
 */
export async function triggerRedeploy(): Promise<{ ok: boolean; buildId?: string; error?: string }> {
  const url = process.env.COOLIFY_URL;
  const appId = process.env.COOLIFY_APP_ID;
  const email = process.env.COOLIFY_EMAIL;
  const password = process.env.COOLIFY_PASSWORD;
  if (!url || !appId || !email || !password) return { ok: false, error: "Coolify env vars no configuradas" };

  try {
    const loginRes = await fetch(`${url}/api/v1/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, isLogin: true }),
      cache: "no-store",
    });
    if (!loginRes.ok) return { ok: false, error: `login ${loginRes.status}` };
    const { token } = (await loginRes.json()) as { token?: string };
    if (!token) return { ok: false, error: "login sin token" };

    const deployRes = await fetch(`${url}/api/v1/applications/${appId}/deploy`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: "{}",
      cache: "no-store",
    });
    if (!deployRes.ok) return { ok: false, error: `deploy ${deployRes.status}` };
    const data = (await deployRes.json()) as { buildId?: string };
    return { ok: true, buildId: data.buildId };
  } catch (e: unknown) {
    return { ok: false, error: String((e as Error)?.message || e).slice(0, 200) };
  }
}
