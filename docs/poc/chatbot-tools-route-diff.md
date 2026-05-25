# POC — Diff que activaría las tools en producción

NO aplicar. Solo demostrativo.

## Cambio en `app/api/chat/route.ts`

```diff
 import { createOpenRouter } from "@openrouter/ai-sdk-provider";
-import { convertToModelMessages, streamText, type UIMessage } from "ai";
+import { convertToModelMessages, streamText, stepCountIs, type UIMessage } from "ai";
 import { buildSystemPrompt } from "@/lib/chat/systemPrompt";
+import { hubTools } from "@/lib/chat/tools";
 import { checkRateLimit, fingerprintFrom } from "@/lib/chat/rateLimit";
 import { saveConversationTurn } from "@/lib/chat/persist";

 // ... (todo igual hasta streamText) ...

   const result = streamText({
     model: openrouter.chat(MODEL),
     system: buildSystemPrompt(),
     messages: await convertToModelMessages(messages),
     temperature: 0.4,
+    tools: hubTools,
+    stopWhen: stepCountIs(5), // máximo 5 turnos de tool calls antes de terminar
     onFinish: async ({ text, usage }) => {
       // ... persistencia igual ...
     },
   });
```

## Cambio en `lib/chat/systemPrompt.ts`

Añadir al final del prompt (sección nueva):

```typescript
 # Herramientas disponibles

 Tienes 4 herramientas que puedes invocar cuando ayuden a responder mejor:

 1. **getRoomInfo(slug)** — datos frescos de una sala (capacidad, equipamiento).
    Úsala cuando preguntan por una sala concreta y no estés 100% seguro
    de la info exacta del knowledge base.

 2. **calculateQuote(roomSlug, hours, role)** — calcula precio con descuento
    aplicado. Úsala cuando piden presupuesto concreto.

 3. **proposeBookingLink(roomSlug)** — genera URL de reserva online.
    Úsala cuando el usuario decide reservar.

 4. **captureLead(name, email, summary)** — guarda contacto del visitante.
    ÚSALA SOLO si el visitante te ha dado voluntariamente sus datos.

 No menciones que tienes "herramientas". Úsalas de forma natural,
 como si supieras las cosas. El usuario solo ve tu respuesta final.
```

## Qué cambia en la UX

**Antes** (tu chatbot actual, sin tools):

> **Usuario**: ¿cuánto cuesta Sócrates 3 horas siendo coworker?
> **Bot**: Sócrates tiene una tarifa de 15€/hora. Para coworkers tenemos
> un 30% de descuento, así que serían unos 31,50€... (PUEDE ALUCINAR
> precios si el knowledge base no los tiene exactos)

**Después** (con tools):

> **Usuario**: ¿cuánto cuesta Sócrates 3 horas siendo coworker?
> **[Tool call interno]**: calculateQuote(roomSlug="socrates", hours=3, role="member")
> **[Tool result]**: { final_price_eur: 31.50, base_price_eur: 45, discount_pct: 30 }
> **Bot**: Te saldrían 31,50€ por las 3 horas en Sócrates con tu
> descuento de coworker (-30% sobre los 45€ normales). ¿Quieres
> que te genere el link para reservar?

## Por qué esto es mejor

1. **Type-safe**: el LLM no puede inventar slug de sala — Zod lo valida.
2. **Sin alucinación de precios**: el cálculo lo hace TypeScript, no el LLM.
3. **Reactivo a cambios**: actualizas `faq.json` y el bot reflejará el cambio inmediatamente (sin retraining ni redeploy de prompts).
4. **Trazabilidad**: cada tool call queda en logs — sabes qué cálculos hizo el bot.
5. **Path natural a Cal.com**: cuando migremos (Fase 3), `proposeBookingLink` cambia su retorno a la URL de Cal.com. El system prompt y la lógica no cambian.

## Coste

Cero. Tools van en el mismo request al LLM. Token overhead despreciable.
Tiempo de respuesta: 1 round-trip extra cuando se llama a una tool
(~500ms con Claude Haiku 4.5).

## Cuándo activarlo

- **Antes de**: integración Cal.com (es el pre-requisito natural).
- **Después de**: cerrar las 4 pendientes actuales (Force Redeploy, fotos
  reales, Stripe webhook, Cal.com Fase 0).

Lo dejo aquí para que lo veas. Cuando lleguemos al punto del roadmap,
es renombrar 1 archivo + 3 líneas en route.ts + sección en system prompt.
30 minutos.
