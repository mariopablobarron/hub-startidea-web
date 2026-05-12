"use client";

import { useActionState, useId, useRef } from "react";
import { useFormStatus } from "react-dom";
import { submitContact, type ContactState } from "@/lib/contact/actions";
import { CONTACT_TOPICS, TOPIC_LABELS } from "@/lib/contact/schema";
import { content } from "@/lib/content";

const initial: ContactState = { status: "idle" };

export function ContactForm() {
  const [state, action] = useActionState(submitContact, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const id = useId();

  // Si el envío fue OK, resetear el form (mantenemos el banner verde encima).
  if (state.status === "ok" && formRef.current) {
    queueMicrotask(() => formRef.current?.reset());
  }

  const fe = state.status === "error" ? state.fieldErrors || {} : {};

  return (
    <form
      ref={formRef}
      action={action}
      noValidate
      className="space-y-4 rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur md:p-8"
    >
      <h3 className="font-display text-2xl text-white">Cuéntanos qué buscas</h3>
      <p className="text-sm text-white/80">
        Te respondemos en menos de 24 horas laborables.
      </p>

      {/* Banner de estado */}
      {state.status === "ok" && (
        <div
          role="status"
          className="rounded-xl border border-white/30 bg-white/15 px-4 py-3 text-sm text-white"
        >
          ✓ {state.message}
        </div>
      )}
      {state.status === "error" && !state.fieldErrors && (
        <div
          role="alert"
          className="rounded-xl border border-red-300 bg-red-500/20 px-4 py-3 text-sm text-white"
        >
          {state.message}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <FormField label="Nombre" id={`${id}-name`} error={fe.name} required>
          <input
            id={`${id}-name`}
            name="name"
            type="text"
            autoComplete="name"
            required
            className="form-input"
            aria-invalid={Boolean(fe.name)}
          />
        </FormField>
        <FormField label="Email" id={`${id}-email`} error={fe.email} required>
          <input
            id={`${id}-email`}
            name="email"
            type="email"
            autoComplete="email"
            required
            className="form-input"
            aria-invalid={Boolean(fe.email)}
          />
        </FormField>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <FormField label="Teléfono (opcional)" id={`${id}-phone`} error={fe.phone}>
          <input
            id={`${id}-phone`}
            name="phone"
            type="tel"
            autoComplete="tel"
            className="form-input"
            aria-invalid={Boolean(fe.phone)}
          />
        </FormField>
        <FormField label="Tipo de consulta" id={`${id}-topic`} error={fe.topic}>
          <select id={`${id}-topic`} name="topic" className="form-input" defaultValue="">
            <option value="">— Selecciona —</option>
            {CONTACT_TOPICS.map((t) => (
              <option key={t} value={t}>
                {TOPIC_LABELS[t]}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      <FormField label="Sala de interés (opcional)" id={`${id}-room`} error={fe.roomSlug}>
        <select id={`${id}-room`} name="roomSlug" className="form-input" defaultValue="">
          <option value="">— Indiferente / general —</option>
          {content.rooms.map((r) => (
            <option key={r.slug} value={r.slug}>
              {r.name}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="Mensaje" id={`${id}-message`} error={fe.message} required>
        <textarea
          id={`${id}-message`}
          name="message"
          rows={4}
          required
          minLength={10}
          maxLength={2000}
          className="form-input"
          aria-invalid={Boolean(fe.message)}
          placeholder="Cuéntanos brevemente qué necesitas (fechas, tipo de evento, número de personas, etc.)"
        />
      </FormField>

      {/* Honeypot — invisible para humanos, atrae bots */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor={`${id}-website`}>Web</label>
        <input
          id={`${id}-website`}
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <label className="flex items-start gap-2 text-sm text-white/90">
        <input
          name="consent"
          type="checkbox"
          required
          className="mt-1 h-4 w-4 shrink-0 rounded border-white/40 accent-white"
          aria-invalid={Boolean(fe.consent)}
        />
        <span>
          Acepto la{" "}
          <a href="/privacidad" className="underline underline-offset-2 hover:text-white">
            política de privacidad
          </a>{" "}
          y que me contestéis a este email.
        </span>
      </label>
      {fe.consent && (
        <div className="text-xs text-red-100" role="alert">
          {fe.consent}
        </div>
      )}

      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-full bg-[var(--color-ink)] px-6 py-3 text-sm font-medium text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Enviando…" : "Enviar mensaje"}
    </button>
  );
}

function FormField({
  label,
  id,
  required,
  error,
  children,
}: {
  label: string;
  id: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-white">
        {label}
        {required && <span className="ml-1 text-white/60">*</span>}
      </label>
      <div className="mt-1.5">{children}</div>
      {error && (
        <div className="mt-1 text-xs text-red-100" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
