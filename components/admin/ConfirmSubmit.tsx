"use client";

import { useRef } from "react";

/**
 * Botón submit con confirm() nativo del navegador antes de enviar el form.
 * Pensado para acciones destructivas (borrar, eliminar) en /admin.
 *
 * Por qué no `onSubmit` en el form: el form aquí es un Server Component
 * (action={serverAction}), no podemos pasarle handlers. Por eso interceptamos
 * en el botón. Si el usuario cancela, prevent + stopPropagation.
 */
export function ConfirmSubmit({
  children,
  message,
  className,
}: {
  children: React.ReactNode;
  message: string;
  className?: string;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  return (
    <button
      ref={ref}
      type="submit"
      className={className}
      onClick={(e) => {
        if (!window.confirm(message)) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
    >
      {children}
    </button>
  );
}
