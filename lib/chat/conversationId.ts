import path from "node:path";

export const CONVERSATION_STORAGE_ROOT = "data/conversations";

const UUID_V4_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class InvalidConversationIdError extends Error {
  constructor() {
    super("conversationId debe ser un UUID v4 canónico");
    this.name = "InvalidConversationIdError";
  }
}

/** Valida un identificador ya existente. Nunca genera ni acepta rutas. */
export function normalizeConversationId(value: unknown): string {
  if (typeof value !== "string" || !UUID_V4_RE.test(value)) {
    throw new InvalidConversationIdError();
  }
  return value.toLowerCase();
}

/** El servidor genera el id cuando el cliente no aporta ninguno. */
export function resolveConversationId(value: unknown): string {
  return value === undefined ? crypto.randomUUID() : normalizeConversationId(value);
}

/**
 * Construye la única ruta permitida para persistencia del chat y comprueba
 * contención POSIX antes de entregarla a la API de GitHub.
 */
export function conversationStoragePath(startedAt: string, value: unknown): string {
  const conversationId = normalizeConversationId(value);
  const parsedDate = new Date(startedAt);
  if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString() !== startedAt) {
    throw new Error("startedAt debe ser una fecha ISO canónica");
  }

  const date = startedAt.slice(0, 10);
  const root = path.posix.resolve("/", CONVERSATION_STORAGE_ROOT);
  const expectedDirectory = path.posix.join(root, date);
  const candidate = path.posix.resolve(expectedDirectory, `${conversationId}.json`);

  if (path.posix.dirname(candidate) !== expectedDirectory || !candidate.startsWith(`${root}/`)) {
    throw new Error("Ruta de conversación fuera del directorio permitido");
  }

  return candidate.slice(1);
}
