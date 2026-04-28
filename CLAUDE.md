# hub-startidea-web — contexto para Claude

Web pública del **coworking HUB Startidea** (C/Conde Cifuentes 33, Granada).
NO confundir con el SaaS HUB OS (`/Users/STARTIDEA/HUB`) ni con la web corporativa Startidea (`/Users/STARTIDEA/web de startidea`).

## Stack

- **Framework**: Next.js 15 + React 19 + Tailwind 4 + TypeScript + pnpm
- **Auth admin**: NextAuth v5 con Credentials simples (env vars)
- **CMS**: archivo `data/content.json` editado vía `/admin` → cada Save commit a GitHub via Octokit + auto-redeploy en Coolify
- **Hosting**: Coolify v3.12 en VPS Hostinger (panel http://72.61.195.108:3000)
- **DNS**: Hostinger (NS dns-parking.com) → gestión vía `hostinger-mcp`

## URLs

| Sitio | URL |
|---|---|
| Web pública | https://hubstartidea.es |
| Panel admin | https://hubstartidea.es/admin |
| Login Coolify | http://72.61.195.108:3000 (mario@startidea.es) |
| Repo GitHub | https://github.com/mariopablobarron/hub-startidea-web |
| App ID Coolify | `cmoh4y0cq0015p2a42pmunvpo` |

## Comunicación

- Siempre en **español**
- Ejecuta con la herramienta disponible (gh, hostinger-mcp, playwright, octokit) en lugar de pedirle pasos a Mario
- Tras plan + verificación verde, procede sin pedir confirmación (excepto acciones irreversibles)
- Mantén espíritu crítico — no validar automáticamente, observaciones respetuosas

## Estructura clave

```
data/content.json          ← single source of truth de TODO el contenido editable
lib/content.ts             ← re-export typed del JSON
lib/admin/persist.ts       ← Octokit commits + triggerRedeploy() vía Coolify API
lib/admin/actions.ts       ← server actions "use server" para cada sección
auth.ts + auth.config.ts   ← NextAuth v5
middleware.ts              ← protege /admin/*
app/admin/                 ← UI del panel
```

## Memorias

Lee `~/.claude/projects/-Users-STARTIDEA-hub-startidea-web/memory/MEMORY.md` para el índice completo de playbooks, references y feedback acumulado.

## Variables de entorno (Coolify Secrets)

- Admin: `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `AUTH_SECRET`, `NEXTAUTH_URL`, `AUTH_TRUST_HOST=true`
- GitHub: `GITHUB_TOKEN` (PAT con Contents:RW), `GITHUB_OWNER`, `GITHUB_REPO`, `GITHUB_BRANCH=main`
- Auto-redeploy Coolify: `COOLIFY_URL`, `COOLIFY_APP_ID`, `COOLIFY_EMAIL`, `COOLIFY_PASSWORD`
