# Operations runbook — HUB Startidea

Fuente de verdad operativa. Si algo de aquí contradice la memoria local
de Claude o conversaciones pasadas, **gana este documento**.

## Stack en producción

| Componente | Implementación | Dónde |
|---|---|---|
| Web | Next.js 15 + Prisma 6 + NextAuth v5 | `hubstartidea.es` |
| BD | Postgres 16-alpine | container `hub-db` (vol `hub-db-data`) |
| Cache/Sessions | Redis 7-alpine | container `hub-redis` |
| Email | Resend SMTP (cuenta compartida ecosistema Startidea) | env `RESEND_API_KEY` |
| Chat texto | OpenRouter (Claude Haiku 4.5) | env `OPENROUTER_API_KEY` |
| Voz | ElevenLabs Conversational AI · agente `agent_9501kse72fyxevnsk9mseptbtamx` | voz clonada Mario (es-andalusian) |
| Reservas | Sistema custom (`/reservar` + `/admin/agenda` + `/admin/reservas`) | hasta Cal.com Fase 6 (deuda) |
| Cal.com self-host | `cal.hubstartidea.es` — solo Fase 0 LIVE | container `cmpaiat5n...-cal-web` |

## Deploy

**El deploy NO va por Coolify** — usa GitHub Actions → SSH al VPS.

| Disparador | Resultado |
|---|---|
| `git push origin main` con cambios fuera de `docs/`, `reports/`, README | GH Actions `deploy.yml` SSH al VPS → ejecuta `/root/deploy-hub-startidea-web.sh` |
| Push manual del workflow | `gh workflow run deploy.yml --ref main` |
| Re-deploy del último HEAD | `ssh root@72.61.195.108 bash /root/deploy-hub-startidea-web.sh` |

El script hace `git fetch + reset --hard origin/main`, `docker build -t cmoh4y0cq...:$SHA`, sincroniza env desde Coolify BD, actualiza tag en `/docker/hub-startidea-web-traefik/docker-compose.yml`, recrea container con `docker compose up -d --force-recreate`, smoke test.

**Tiempo típico**: 5-8 minutos.

**Errores comunes**:

- `frontend grpc server closed unexpectedly`: error transitorio buildkit por carga VPS. Re-ejecutar `bash /root/deploy-hub-startidea-web.sh`.
- GH Actions falla pero el push subió: comprobar `gh run list --workflow=deploy.yml -L 3` y re-disparar manualmente.

**NUNCA usar el botón "Redeploy" en Coolify para esta app** — el deploy NO va por Coolify aunque la app aparezca ahí. Sólo `cal-com-hub` se redeploya desde Coolify.

## Crons

Todos en VPS root (`crontab -e`).

| Cron | Comando | Propósito |
|---|---|---|
| `*/2 * * * *` | `/usr/local/bin/cal-uptime.sh` | Watchdog Telegram cal.hubstartidea.es |
| `35 3 * * *` | `/usr/local/bin/cal-backup.sh` | Backup cal-db diario (retención 14d) |
| `5 4 * * *` | `/usr/local/bin/cal-backup-monitor.sh` | Alerta TG si no hay backup en 26h |
| `0 4 * * *` | `/root/scripts/hub-db-backup.sh` | Backup hub-db diario |
| `0 22 * * *` | `curl /api/cron/complete-past-bookings` | Bookings pasadas → COMPLETED, PENDING expira → CANCELLED |
| `0 * * * *` | `curl /api/cron/event-reminders` | Email 24h antes de eventos (cuando se activen) |

Auth de los crons HTTP: `Authorization: Bearer $CRON_SECRET` (env del container).

## Secrets

Vivos en BD Coolify cifrados con `aes-256-ctr` + `COOLIFY_SECRET_KEY` (env del container coolify). Coolify v3 quirks documentados en memoria `infra-startidea.md` sección 2026-05-25:

- buildPack=docker **NO** pasa secrets como `--build-arg`. Variables `NEXT_PUBLIC_*` se hardcodean en código.
- El deploy script `coolify-env-sync.sh` descifra y vuelca a `/docker/hub-startidea-web-traefik/.env` antes de cada deploy.

Secrets relevantes (no valores, solo nombres):

| Nombre | Para qué |
|---|---|
| `DATABASE_URL` | Postgres `hub-db` |
| `NEXTAUTH_SECRET` | NextAuth v5 JWT signing |
| `RESEND_API_KEY` | Email transaccional |
| `OPENROUTER_API_KEY` | Chat texto (claude haiku 4.5) |
| `CRON_SECRET` | Bearer para `/api/cron/*` |
| `STRIPE_SECRET_KEY` | Reservas con pago (**test mode**, `sk_test_*`) |
| `STRIPE_WEBHOOK_SECRET` | ✅ Configurado 2026-05-28 (test mode). Webhook `we_1TcBX1AIr4Y8vEdqxMXVHFai` con eventos `checkout.session.completed` + `expired`. Para live mode: crear nuevo webhook con `sk_live_*` y rotar este secret. |
| `GITHUB_TOKEN` | Listar conversaciones del chat (Octokit) |
| `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` | Notif admin de bookings/contact |
| `GSC_OAUTH_*` | SEO admin (Search Console) |
| `NEXT_PUBLIC_SENTRY_DSN` | ⏳ Pendiente. SDK ya integrado (`@sentry/nextjs` 10.55), no inicializa sin DSN. |
| `SENTRY_AUTH_TOKEN` | ⏳ Pendiente. Solo build-time, para subir source maps. Sin él el SDK funciona pero stack traces quedan minificados. |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Solo seed inicial |

## Diagnóstico común

### "El sitio está caído"

```bash
ssh root@72.61.195.108 'docker ps --filter "name=hub-startidea-web"'
# Debería decir "Up X minutes"
curl -I https://hubstartidea.es/
# 200 OK
```

Si caído:
```bash
ssh root@72.61.195.108 'docker logs hub-startidea-web --tail 50'
ssh root@72.61.195.108 'docker restart hub-startidea-web'
```

### "Las reservas no llegan a Telegram"

```bash
ssh root@72.61.195.108 'docker logs hub-startidea-web 2>&1 | grep -i telegram | tail -10'
```

Comprobar que `TELEGRAM_BOT_TOKEN` y `TELEGRAM_CHAT_ID` están en env del container.

### "El chatbot no responde"

```bash
curl https://hubstartidea.es/api/chat -X POST \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","parts":[{"type":"text","text":"hola"}]}]}'
```

Si 503 "OpenRouter API key no configurada" → comprobar `OPENROUTER_API_KEY` en env.

### "El voice widget no aparece"

NEXT_PUBLIC_ELEVENLABS_AGENT_ID está **hardcoded** en `components/VoiceWidget.tsx` constante `AGENT_ID`. Si quieres rotar el agente: editar la constante + commit + redeploy.

### "Cal.com (cal.hubstartidea.es) caído"

Watchdog te avisa por Telegram automáticamente. Si la causa es "Coolify recreó cal-web y borró labels Traefik":

```bash
scp /Users/STARTIDEA/cal-com-hub/scripts/recreate-cal-web.py root@72.61.195.108:/tmp/
ssh root@72.61.195.108 'docker inspect cmpaiat5n0004qfa4r6m8l8rl-cal-web > /tmp/cal-web-snapshot.json && python3 /tmp/recreate-cal-web.py'
```

### "Quiero ver bookings ahora mismo"

`https://hubstartidea.es/admin/agenda` (login admin).

## Backups

| Servicio | Script | Cron | Retención |
|---|---|---|---|
| `hub-db` (Postgres custom bookings/users) | `/root/scripts/hub-db-backup.sh` | `0 4 * * *` | 14 días |
| `cal-db` (Postgres Cal.com) | `/usr/local/bin/cal-backup.sh` | `35 3 * * *` | 14 días |

Almacenados en `/data/cal-com-hub-backups/` y `/data/hub-startidea-backups/` respectivamente.

Restore (ejemplo cal-db):
```bash
ssh root@72.61.195.108
gunzip -c /data/cal-com-hub-backups/cal_YYYYMMDD_HHMMSS.sql.gz | \
  docker exec -i cmpaiat5n0004qfa4r6m8l8rl-cal-db psql -U calcom -d calcom
```

## Flujos principales del usuario

### Reservar sala (público)

1. Visitor → `hubstartidea.es/reservar` → **AnonymousLanding** (CTAs: Crear cuenta / Login)
2. Crear cuenta → `/registro?callbackUrl=/reservar` → email + nombre → magic-link via Resend
3. Click magic-link → aterriza en `/reservar` autenticado
4. **SlotPicker visual** (grid 08-21 con celdas verdes/grises/seleccionadas)
5. Rellenar propósito → submit → `createBooking()` server action
6. Notif Telegram al admin + email al usuario
7. Status inicial:
   - MEMBER/ADMIN → CONFIRMED instantáneo
   - CLIENT/COLLABORATOR → PENDING (admin aprueba en `/admin/reservas`)

### Admin gestiona reservas

1. `/admin` → dashboard con métrica "Agenda hoy"
2. `/admin/agenda` → grid visual de las 5 salas × 13 horas (día seleccionable)
   - **Click en celda libre** → `/reservar?sala=X&fecha=Y&hora=H` (pre-rellenado)
   - **Click en celda ocupada** → `/admin/reservas#booking-id`
3. `/admin/reservas` → lista con filtros estado + sala + widget "Hoy" chips
4. Aprobar/cancelar/no-show con `ConfirmSubmit` para destructivas

### Voice agent

1. Visitor abre cualquier página → `<VoiceWidget>` carga script ElevenLabs CDN
2. Click "Start a call" → conexión WebRTC + voz Mario clonada
3. Conversación en español, knowledge embedded en system prompt
4. Si el visitor da email → guardado en transcripción (admin la ve en panel ElevenLabs)

## Pendientes activos

| # | Pendiente | Responsable |
|---|---|---|
| 1 | Setup admin Cal.com en `/auth/setup` | Mario |
| 2 | Cambiar password Coolify temporal | Mario |
| 3 | Stripe **live mode** + nuevo webhook con `sk_live_*` (cuando vayas a cobrar real) | Mario crea, yo inyecto |
| 4 | Crear proyecto Sentry `hub-startidea-web` en `de.sentry.io` + DSN | Mario crea, yo inyecto cifrado en Coolify |
| 5 | Mapa oficina en `/public/floorplan/` | Mario sube archivo |
| 6 | Cal.com Fase 1: POC sala Sócrates como event-type | Después de #1 |
| 7 | Modo kiosco tablet (PIN auth, UI touch) | Cuando llegue hardware |
| 8 | KB completo a panel ElevenLabs (opcional, mejora respuestas) | Mario |
| 9 | Cal.com Fase 2-6: 5 salas con 3 roles + redirect `/reservar` → cal | Tras Fase 1 |

## Cambios significativos 2026-05-28

- ✅ **Stripe webhook** `we_1TcBX1AIr4Y8vEdqxMXVHFai` creado vía API Stripe + `STRIPE_WEBHOOK_SECRET` inyectado cifrado en Coolify BD (técnica documentada en memoria `reference_coolify_aes_secret_inject.md`). Webhook valida signatures HMAC.
- ✅ **Umami analytics** — fix backend: insertado website `2c83c9c1-7b4d-4206-8f7e-551874203ef6` en `umami-db` (no existía → 400 silencioso, web no trackeaba nada). Receta y patrón en memoria `reference_umami_uuid_must_exist.md`.
- ✅ **Sentry SDK** integrado (`@sentry/nextjs` 10.55): `instrumentation.ts`, `instrumentation-client.ts`, `app/global-error.tsx`, `withSentryConfig` en `next.config.ts`, ARGs en Dockerfile. Sin DSN no inicializa, así que producción no afectada hasta que se configure.
- ✅ **Accessibility WCAG AA** — Lighthouse mobile 100 en home, `/salas`, `/salas/cc33`. Cambios: `--color-mute` → `#595959`, footer opacity `/50→/65`, `coral-500→coral-700` en badges magenta sobre imagen, `coral-600` → `#a9234e` global.
- ✅ **Gráfica tendencia 12 semanas** en `/admin/seo` (sparklines SVG, 0 deps nuevas) + **alerta 🚨** en cron weekly cuando clicks caen >50% (script versionado en `scripts/seo-weekly-report.sh` + desplegado en VPS).
- ✅ **Tests E2E** nuevos: VoiceWidget, desglose IVA, slots libres agenda admin.

## Repos relacionados

- `mariopablobarron/hub-startidea-web` (este) — web + booking system
- `mariopablobarron/cal-com-hub` — infra Cal.com self-host (yml + scripts)
- `/Users/STARTIDEA/voice-agent-hub/` — local, KB + system prompt voice agent (no pusheado)

## URLs operativas

- `hubstartidea.es` — la web
- `cal.hubstartidea.es` — Cal.com self-host
- `coolify.startidea.es` — panel Coolify (gestión secrets)
- `https://elevenlabs.io/app/agents` — panel agente de voz

## Bots Telegram operativos

| Bot | Notifica |
|---|---|
| `@TRESMILMILLONESDELATIDOSBOT` | Watchdogs (cal, raizyaccion), backups, contact form, bookings |
