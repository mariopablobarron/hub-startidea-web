import assert from "node:assert/strict";
import test from "node:test";
import { POST } from "../app/api/chat/route";
import {
  CONVERSATION_STORAGE_ROOT,
  conversationStoragePath,
  normalizeConversationId,
  resolveConversationId,
} from "../lib/chat/conversationId";
import { saveConversationTurn } from "../lib/chat/persist";

const canonicalId = "123e4567-e89b-42d3-a456-426614174000";
const startedAt = "2026-08-22T12:00:00.000Z";
const traversalIds = [
  "../admin",
  "..\\admin",
  "/admin",
  "data/conversations/../../package",
  "%2e%2e%2fadmin",
  ".",
  "",
  "123e4567-e89b-12d3-a456-426614174000",
];

test("el servidor genera un UUID v4 cuando conversationId no está presente", () => {
  assert.match(
    resolveConversationId(undefined),
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
  );
});

test("solo se aceptan UUID v4 canónicos", () => {
  assert.equal(normalizeConversationId(canonicalId.toUpperCase()), canonicalId);
  for (const value of [...traversalIds, null, 7, {}]) {
    assert.throws(() => normalizeConversationId(value), /UUID v4/);
  }
});

test("separadores y puntos reciben 400 antes de consultar proveedor o GitHub", async () => {
  for (const conversationId of traversalIds) {
    const response = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [], conversationId }),
      }),
    );
    assert.equal(response.status, 400, conversationId);
  }
});

test("la ruta final siempre queda bajo data/conversations", () => {
  const ids = [canonicalId, "550e8400-e29b-41d4-a716-446655440000"];
  for (const id of ids) {
    const result = conversationStoragePath(startedAt, id);
    assert.equal(result, `${CONVERSATION_STORAGE_ROOT}/2026-08-22/${id}.json`);
    assert.equal(result.startsWith(`${CONVERSATION_STORAGE_ROOT}/`), true);
    assert.equal(result.includes(".."), false);
  }
});

test("ningún identificador inválido puede producir ni actualizar JSON fuera del prefijo", async () => {
  for (const conversationId of traversalIds) {
    assert.throws(() => conversationStoragePath(startedAt, conversationId));
    await assert.rejects(
      saveConversationTurn({
        conversationId,
        fingerprint: "test",
        userMessage: undefined,
        assistantMessage: { role: "assistant", content: "test" },
      }),
      /UUID v4/,
    );
  }
});

test("una fecha no canónica tampoco puede alterar el directorio", () => {
  assert.throws(() => conversationStoragePath("../../2026-08-22", canonicalId), /fecha ISO/);
});
