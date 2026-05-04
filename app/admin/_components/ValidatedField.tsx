"use client";

import { useId, useState } from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/cn";

type BaseProps = {
  label: string;
  hint?: string;
  required?: boolean;
  /** Validación cliente que se ejecuta on blur. Devuelve mensaje de error o null. */
  validate?: (value: string) => string | null;
};

type InputProps = BaseProps & React.InputHTMLAttributes<HTMLInputElement>;
type TextareaProps = BaseProps & React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export function ValidatedInput({ label, hint, validate, ...props }: InputProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const [error, setError] = useState<string | null>(null);

  return (
    <label htmlFor={id} className="block text-sm">
      <span className="font-medium">
        {label}
        {props.required && <span className="ml-0.5 text-[var(--color-coral-600)]">*</span>}
      </span>
      {hint && <span className="ml-2 text-xs text-[var(--color-mute)]">{hint}</span>}
      <input
        {...props}
        id={id}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        onBlur={(e) => {
          if (validate) setError(validate(e.target.value));
          props.onBlur?.(e);
        }}
        onChange={(e) => {
          if (error) setError(null);
          props.onChange?.(e);
        }}
        className={cn(
          "mt-1 w-full rounded-lg border px-3 py-2 text-sm transition focus:outline-none",
          error
            ? "border-red-400 focus:border-red-600"
            : "border-[var(--color-line)] focus:border-[var(--color-ink)]",
          props.className,
        )}
      />
      {error && (
        <span id={errorId} role="alert" className="mt-1 flex items-center gap-1 text-xs text-red-700">
          <AlertCircle size={12} aria-hidden />
          {error}
        </span>
      )}
    </label>
  );
}

export function ValidatedTextarea({ label, hint, validate, ...props }: TextareaProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const [error, setError] = useState<string | null>(null);

  return (
    <label htmlFor={id} className="block text-sm">
      <span className="font-medium">
        {label}
        {props.required && <span className="ml-0.5 text-[var(--color-coral-600)]">*</span>}
      </span>
      {hint && <span className="ml-2 text-xs text-[var(--color-mute)]">{hint}</span>}
      <textarea
        {...props}
        id={id}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        onBlur={(e) => {
          if (validate) setError(validate(e.target.value));
          props.onBlur?.(e);
        }}
        onChange={(e) => {
          if (error) setError(null);
          props.onChange?.(e);
        }}
        className={cn(
          "mt-1 w-full rounded-lg border px-3 py-2 text-sm transition focus:outline-none",
          error
            ? "border-red-400 focus:border-red-600"
            : "border-[var(--color-line)] focus:border-[var(--color-ink)]",
          props.className,
        )}
      />
      {error && (
        <span id={errorId} role="alert" className="mt-1 flex items-center gap-1 text-xs text-red-700">
          <AlertCircle size={12} aria-hidden />
          {error}
        </span>
      )}
    </label>
  );
}

/** Validadores comunes — reutilizables. */
export const validators = {
  required: (msg = "Este campo no puede quedar vacío.") =>
    (v: string) => (v.trim() ? null : msg),
  url: (msg = "URL no válida (debe empezar por https://).") =>
    (v: string) => {
      if (!v) return null;
      try {
        new URL(v);
        return null;
      } catch {
        return msg;
      }
    },
  email: (msg = "Email no válido.") => (v: string) =>
    !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : msg,
  minLength: (n: number, msg?: string) => (v: string) =>
    v.length >= n ? null : msg ?? `Mínimo ${n} caracteres.`,
  maxLength: (n: number, msg?: string) => (v: string) =>
    v.length <= n ? null : msg ?? `Máximo ${n} caracteres.`,
};
