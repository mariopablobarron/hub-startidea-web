import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-page grid min-h-[80vh] place-items-center pt-32 text-center">
      <div>
        <div className="font-display text-7xl tracking-tight md:text-9xl">404</div>
        <p className="mt-4 max-w-md text-[var(--color-mute)]">
          Esta página no existe en el HUB. Quizá te has equivocado de pasillo —
          vuelve al hall y empezamos de nuevo.
        </p>
        <Link href="/" className="btn-primary mt-8">Volver al inicio</Link>
      </div>
    </div>
  );
}
