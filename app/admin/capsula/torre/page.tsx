import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/roles";
import { TorreDeControl } from "./TorreDeControl";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Torre de Control · Cápsula del Tiempo",
  robots: { index: false, follow: false },
};

/**
 * /admin/capsula/torre — diseña una sesión de la Cápsula del Tiempo a medida
 * del invitado: chateas con la IA para perfilar a la persona y genera su
 * guion personalizado, que luego usas en vivo.
 */
export default async function TorrePage() {
  await requireAdmin();
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold">Cápsula del Tiempo · Torre de Control</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Cuéntale a la IA quién es la persona que vas a recibir. Cuando tengas el contexto,
        genera su guion a medida (historia, preguntas, reflexión) y ábrelo en vivo.
      </p>
      <TorreDeControl />
    </main>
  );
}
