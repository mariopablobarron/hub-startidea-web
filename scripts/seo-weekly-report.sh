#!/usr/bin/env bash
# seo-weekly-report.sh — Reporte semanal de Google Search Console enviado
# por Telegram. Compara semana actual vs anterior para detectar cambios
# significativos y manda resumen + top queries.
#
# Ejecuta cron lunes 09:00 UTC. Si no hay datos suficientes (todavía
# poca impresión), permanece en silencio para no spamear.
#
# Reutiliza:
#   - Credenciales OAuth de Google del container luciernaga-ai
#   - Tokens Telegram de /root/scripts/uptime-watchdog.env
#
# Sites monitorizados: hubstartidea.es y luciérnaga (tresmilmillonesdelatidos.es).
# Se podría extender a más añadiendo a SITES_RAW.
#
# Despliegue:
#   scp scripts/seo-weekly-report.sh root@72.61.195.108:/usr/local/bin/seo-weekly-report.sh
#   ssh root@72.61.195.108 'chmod +x /usr/local/bin/seo-weekly-report.sh'

set -uo pipefail

LOG=/var/log/seo-weekly-report.log
SITES_ENV=/root/scripts/uptime-watchdog.env
MIN_IMPRESSIONS=10   # umbral mínimo de impresiones para considerar que hay datos
ALERT_CLICKS_DROP=50 # % de caída de clicks que dispara 🚨 (vs semana anterior, mínimo 5 clicks previos)
ALERT_MIN_PREV=5     # mínimo de clicks la semana previa para que el % sea significativo

ts() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }
log() { echo "[$(ts)] $*" >> "$LOG"; }

# 1. Validar prerequisitos
if ! docker ps --format '{{.Names}}' | grep -q '^luciernaga-ai$'; then
  log "ERROR: luciernaga-ai container no corre — no puedo obtener credenciales OAuth"
  exit 1
fi

if [ ! -r "$SITES_ENV" ]; then
  log "ERROR: $SITES_ENV no legible"
  exit 1
fi
# shellcheck source=/dev/null
. "$SITES_ENV"
if [ -z "${TELEGRAM_BOT_TOKEN:-}" ] || [ -z "${TELEGRAM_CHAT_ID:-}" ]; then
  log "ERROR: tokens Telegram no configurados"
  exit 1
fi

# 2. Refrescar access_token usando refresh_token de luciérnaga
CLIENT_ID=$(docker exec luciernaga-ai printenv GSC_OAUTH_CLIENT_ID)
CLIENT_SECRET=$(docker exec luciernaga-ai printenv GSC_OAUTH_CLIENT_SECRET)
REFRESH_TOKEN=$(docker exec luciernaga-ai printenv GSC_OAUTH_REFRESH_TOKEN)

if [ -z "$CLIENT_ID" ] || [ -z "$CLIENT_SECRET" ] || [ -z "$REFRESH_TOKEN" ]; then
  log "ERROR: variables OAuth de luciernaga-ai vacías"
  exit 1
fi

TOKEN_RESPONSE=$(curl -sS --max-time 15 -X POST https://oauth2.googleapis.com/token \
  -d "client_id=$CLIENT_ID" \
  -d "client_secret=$CLIENT_SECRET" \
  -d "refresh_token=$REFRESH_TOKEN" \
  -d "grant_type=refresh_token" 2>&1)
ACCESS_TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r '.access_token // empty')

if [ -z "$ACCESS_TOKEN" ]; then
  log "ERROR: refresh_token no devolvió access_token. Response: $(echo "$TOKEN_RESPONSE" | head -c 200)"
  exit 1
fi

# Helpers
query_gsc() {
  # $1 = site (URL-encoded), $2 = startDate, $3 = endDate, $4 = optional dimensions JSON array string
  local site="$1" start="$2" end="$3" dims="${4:-}"
  local body
  if [ -n "$dims" ]; then
    body=$(jq -nc --arg s "$start" --arg e "$end" --argjson d "$dims" \
      '{startDate:$s, endDate:$e, dimensions:$d, rowLimit:5}')
  else
    body=$(jq -nc --arg s "$start" --arg e "$end" \
      '{startDate:$s, endDate:$e, rowLimit:1}')
  fi
  curl -sS --max-time 30 -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$body" \
    "https://www.googleapis.com/webmasters/v3/sites/$site/searchAnalytics/query"
}

# Fechas: semana actual = [hace 8d, hace 1d]. Anterior = [hace 15d, hace 8d].
# Usamos -8d/-1d porque GSC tiene 2-3 días de lag, no -7/0.
DATE_END_CURR=$(date -u -d "1 day ago" +%Y-%m-%d)
DATE_START_CURR=$(date -u -d "8 days ago" +%Y-%m-%d)
DATE_END_PREV=$(date -u -d "8 days ago" +%Y-%m-%d)
DATE_START_PREV=$(date -u -d "15 days ago" +%Y-%m-%d)

# Sites a reportar (URL-encoded para path)
SITES_RAW=(
  "sc-domain:hubstartidea.es|HUB Startidea"
  "sc-domain:tresmilmillonesdelatidos.es|Luciérnaga"
)

SECTIONS=()
TOTAL_CLICKS=0
ALERTS_FIRED=0   # cuántos sites tienen caída ≥50%

for entry in "${SITES_RAW[@]}"; do
  IFS="|" read -r site label <<< "$entry"
  site_enc=$(echo -n "$site" | jq -sRr @uri)

  CURR=$(query_gsc "$site_enc" "$DATE_START_CURR" "$DATE_END_CURR")
  PREV=$(query_gsc "$site_enc" "$DATE_START_PREV" "$DATE_END_PREV")

  if echo "$CURR" | jq -e '.error' > /dev/null 2>&1; then
    err=$(echo "$CURR" | jq -r '.error.message')
    log "ERROR querying $site: $err"
    continue
  fi

  cur_clicks=$(echo "$CURR" | jq -r '.rows[0].clicks // 0')
  cur_imp=$(echo "$CURR" | jq -r '.rows[0].impressions // 0')
  cur_ctr=$(echo "$CURR" | jq -r '(.rows[0].ctr // 0) * 100 | . * 100 | round / 100')
  cur_pos=$(echo "$CURR" | jq -r '(.rows[0].position // 0) | . * 10 | round / 10')

  prev_clicks=$(echo "$PREV" | jq -r '.rows[0].clicks // 0')
  prev_imp=$(echo "$PREV" | jq -r '.rows[0].impressions // 0')

  # Skip si todavía no hay datos relevantes
  cur_imp_int=${cur_imp%.*}
  if [ "${cur_imp_int:-0}" -lt "$MIN_IMPRESSIONS" ]; then
    log "[$label] solo ${cur_imp_int} impresiones — skip (umbral $MIN_IMPRESSIONS)"
    continue
  fi

  # Delta absoluto
  delta_clicks=$((${cur_clicks%.*} - ${prev_clicks%.*}))
  delta_imp=$((${cur_imp%.*} - ${prev_imp%.*}))

  # Delta % de clicks (solo significativo si la semana anterior tenía ≥ALERT_MIN_PREV clicks)
  prev_clicks_int=${prev_clicks%.*}
  delta_clicks_pct=0
  if [ "${prev_clicks_int:-0}" -ge "$ALERT_MIN_PREV" ]; then
    delta_clicks_pct=$(( delta_clicks * 100 / prev_clicks_int ))
  fi

  # Emoji según dirección + alerta especial cuando caída brusca
  emoji_c="➡️"
  [ "$delta_clicks" -gt 0 ] && emoji_c="📈"
  [ "$delta_clicks" -lt 0 ] && emoji_c="📉"
  alert_line=""
  if [ "$delta_clicks_pct" -le "-${ALERT_CLICKS_DROP}" ]; then
    emoji_c="🚨"
    alert_line=$'\n*⚠️ Caída brusca de clicks ('"${delta_clicks_pct}"$'%) — investigar penalización SEO o caída técnica*'
    ALERTS_FIRED=$((ALERTS_FIRED + 1))
  fi

  emoji_i="➡️"
  [ "$delta_imp" -gt 0 ] && emoji_i="📈"
  [ "$delta_imp" -lt 0 ] && emoji_i="📉"

  # Top 5 queries
  TOP=$(query_gsc "$site_enc" "$DATE_START_CURR" "$DATE_END_CURR" '["query"]')
  top_section=""
  if echo "$TOP" | jq -e '.rows | length > 0' > /dev/null 2>&1; then
    top_section=$(echo "$TOP" | jq -r '.rows[] | "  • \(.keys[0]) — \(.clicks|tostring) clicks (pos \(.position|.*10|round|./10))"' | head -5)
  fi

  section=$(printf "*%s*%s\n%s Clicks: %s (Δ %+d)\n%s Impresiones: %s (Δ %+d)\nCTR: %s%%  ·  Pos: %s\n\n_Top queries:_\n%s" \
    "$label" \
    "$alert_line" \
    "$emoji_c" "$cur_clicks" "$delta_clicks" \
    "$emoji_i" "$cur_imp" "$delta_imp" \
    "$cur_ctr" "$cur_pos" \
    "${top_section:-_sin queries todavía_}")

  SECTIONS+=("$section")
  TOTAL_CLICKS=$((TOTAL_CLICKS + ${cur_clicks%.*}))
done

# Si todos los sites quedaron bajo el umbral, no spamear
if [ "${#SECTIONS[@]}" -eq 0 ]; then
  log "Sin datos suficientes en ningún site. No se envía mensaje."
  exit 0
fi

# Construir mensaje
header_prefix="📊"
[ "$ALERTS_FIRED" -gt 0 ] && header_prefix="🚨📊"

HEADER="${header_prefix} *Reporte SEO semanal*
${DATE_START_CURR} → ${DATE_END_CURR}
_(comparado con ${DATE_START_PREV} → ${DATE_END_PREV})_"

BODY=""
for s in "${SECTIONS[@]}"; do
  BODY+="${s}"$'\n\n━━━━━━━━━━\n\n'
done
FOOTER="_Generado por seo-weekly-report.sh en VPS · cada lunes 09:00 UTC_"

MESSAGE="${HEADER}

${BODY}${FOOTER}"

# Enviar Telegram
RESPONSE=$(curl -sS --max-time 15 -X POST \
  -H "Content-Type: application/json" \
  -d "$(jq -nc --arg c "$TELEGRAM_CHAT_ID" --arg t "$MESSAGE" \
    '{chat_id:$c, text:$t, parse_mode:"Markdown", disable_web_page_preview:true}')" \
  "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage")

if echo "$RESPONSE" | jq -e '.ok == true' > /dev/null 2>&1; then
  log "OK enviado ${#SECTIONS[@]} secciones, ${TOTAL_CLICKS} clicks totales, ${ALERTS_FIRED} alertas"
else
  err=$(echo "$RESPONSE" | jq -r '.description // "?"')
  log "ERROR Telegram: $err"
  exit 1
fi
