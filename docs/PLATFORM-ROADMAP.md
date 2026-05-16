# Plataforma HUB Startidea — Roadmap

**Inicio:** 2026-05-16
**Objetivo:** convertir hub-startidea-web (web informativa) en plataforma comunitaria con reservas, eventos, foro y roles. Sin romper lo que ya hay en producción.

## Decisiones tomadas

| Decisión | Elección | Razón |
|---|---|---|
| Persistencia | **Postgres** compartido (Coolify docker-compose, patrón mentor-db) | Reservas/usuarios/eventos requieren BD real. Contenido público sigue en `content.json` |
| Foro | **Construir propio en Next.js** (no Discord, no Discourse aparte) | Una sola app que mantener. Tras incidentes recientes, menos sistemas = menos riesgo |
| Reservas | **Completo** con Stripe Checkout + bonos + descuentos por rol | Lo que pidió el cliente |
| Roadmap | Sprint largo, **commits atómicos deployables** | Mario eligió "todo en paralelo" pero técnicamente lo entrego por fases |
| Auth | **NextAuth v5** (ya está) + RBAC (campo `role` en User) + magic-link para invitar | Bajo esfuerzo, ya conocido |
| ORM | **Prisma** | Ya en uso en luciérnaga, equipo cómodo |
| UI calendar | **react-big-calendar** | Mejor React-native que FullCalendar |
| Pagos | **Stripe Checkout Session** (NO Connect — Mario es único merchant) | Más simple, menos KYC |
| Markdown editor (foro) | `react-markdown` + textarea + GFM | Sin overhead de WYSIWYG complejo |

## Modelos de datos (resumen)

```
User (id, email, name, role, membershipType, membershipUntil)
  enum Role: VISITOR | CLIENT | MEMBER | COLLABORATOR | ADMIN
  enum MembershipType: COWORKER_FIXED | COWORKER_FLEX | OFFICE_PRIVATE

Booking (userId, roomSlug, startsAt, endsAt, status, totalCents, paymentId?, bondId?)
  enum BookingStatus: PENDING | CONFIRMED | CANCELLED | COMPLETED | NO_SHOW

Payment (userId, amountCents, stripeSessionId, status)
PrepaidBond (userId, type, hoursTotal, hoursUsed, expiresAt)
  enum BondType: ROOM_HOURS_10 | ROOM_HOURS_50 | PODCAST_SESSIONS_5 | COWORKING_DAYS_10

Event (slug, title, description, startsAt, endsAt, roomSlug?, isPublic, organizerId, capacity)
EventRegistration (eventId, userId?, email, name, status)

Topic (slug, title, body, authorId, category, pinned, locked)
  enum TopicCategory: GENERAL | ANUNCIOS | PROYECTOS | EVENTOS | COWORKING | AYUDA
Post (topicId, authorId, body)
Reaction (userId, topicId? | postId?, type)
```

## Roles del sistema

- **VISITOR** — sin login, solo lee
- **CLIENT** — cliente puntual; reserva con pago, sin descuento
- **MEMBER** — coworker activo; reserva inmediata + bonos incluidos según plan
- **COLLABORATOR** — red Startidea; -20% en reservas
- **ADMIN** — Mario y equipo; control total

## Fases

### F0 · Plan + Infra (esta sesión)
- Doc roadmap (este archivo)
- Postgres container vía Coolify docker-compose (`hub-db` patrón `mentor-db`)
- Backup diario en cron VPS (patrón `coolify-db-backup.sh`)
- Resource limits (mem 1g, cpu 1) desde el día 1
- Prisma init + datasource configurado

### F1 · Usuarios + Roles + Admin
- Schema Prisma completo
- Migración inicial
- Seed básico (Mario como ADMIN)
- NextAuth v5 con campo `role` en User
- Magic-link via Resend
- /admin/users CRUD
- Middleware RBAC

### F2 · Reservas (sin pagos)
- UI calendario en /reservar
- Form sala + fecha + propósito
- Server actions con validación de overlaps
- Auto-confirm para MEMBER, pending para CLIENT/COLLABORATOR
- Admin /admin/reservas
- Notificaciones Resend + Telegram

### F3 · Pagos Stripe
- Tarifas en BD (tabla `Pricing` por sala + por rol)
- Stripe Checkout flujo
- Bonos prepago (compra + uso)
- Webhooks (`payment_intent.succeeded` → confirm Booking)
- Refunds parciales por admin

### F4 · Eventos
- /admin/eventos CRUD
- /eventos página pública con next 10
- /eventos/[slug] detalle + registro
- .ics descargable
- Sitemap incluye eventos próximos
- Recordatorio email 24h antes

### F5 · Foro
- /comunidad listado por categoría
- /comunidad/[slug] hilo con respuestas
- /comunidad/nuevo crear
- Markdown + sanitize-html
- Reacciones (LIKE / CELEBRATE / IDEA)
- Moderación admin (pin, lock, delete)
- Email al autor cuando hay respuesta nueva

### F6 · Pulido
- Dashboard /me
- Dashboard admin con métricas
- Tests E2E
- Backup BD diario verificado
- Migración a producción

## Estimación

- F0: 1 sesión (hoy)
- F1: 3-4 días
- F2: 5-7 días
- F3: 5-7 días
- F4: 3-4 días
- F5: 5-7 días
- F6: 3-4 días

**Total: 4-6 semanas calendario** trabajando regular.

## Cosas que NO entran en v1

- Multi-idioma (solo español)
- App móvil nativa (PWA basta)
- Chat en tiempo real (es foro, no chat)
- Notificaciones push web
- Integración Google Calendar bidireccional (solo descarga .ics)
- API pública

## Riesgos identificados

1. **VPS frágil tras incidentes recientes** (29-abr zombies, 16-may merch OOM). Mitigación: resource limits desde el día 1 + backups + monitor.
2. **Migración Prisma rompe deploy** — verificar siempre `prisma migrate deploy` en startup.
3. **Stripe webhook security** — verificar signatures, idempotency.
4. **Spam en foro** — rate-limit + honeypot + posible captcha si crece.
5. **Reservas con conflictos** — locks DB y validación overlaps en server action.
