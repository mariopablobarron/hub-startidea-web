import Image from "next/image";
import { Sparkles, Heart, Network } from "lucide-react";

const pillars = [
  {
    icon: Sparkles,
    title: "Innovación con propósito",
    text: "El HUB nació de Startidea, una agencia que lleva años diseñando proyectos sociales. Aquí no se factura por horas: se construye comunidad.",
  },
  {
    icon: Heart,
    title: "Causas que importan",
    text: "Cooperativas, ONG, periodistas, formadores y emprendedores con impacto comparten pasillo, café y conversaciones que cambian planes.",
  },
  {
    icon: Network,
    title: "Conexiones reales",
    text: "Un día programas con un desarrollador. Otro grabas un podcast con una directora de fundación. Aquí se cruzan caminos por diseño.",
  },
];

export function Community() {
  return (
    <section id="comunidad" className="py-24 md:py-32">
      <div className="container-page">
        <div className="max-w-3xl">
          <span className="eyebrow">Comunidad</span>
          <h2 className="mt-4 text-4xl tracking-tight md:text-5xl">
            No alquilamos metros cuadrados. <em className="font-display italic text-[var(--color-coral-600)]">Conectamos personas.</em>
          </h2>
          <p className="mt-6 text-lg text-[var(--color-mute)]">
            El HUB Startidea es el lugar donde aterrizan los proyectos que
            quieren cambiar Granada un poco. Cooperativas, asociaciones,
            estudios pequeños, freelancers con causa, formadores y la radio
            comunitaria comparten edificio, café y tropezones.
          </p>
        </div>

        <div className="mt-16 grid gap-px overflow-hidden rounded-3xl bg-[var(--color-line)] sm:grid-cols-3">
          {pillars.map((p) => (
            <div key={p.title} className="bg-[var(--color-paper)] p-8">
              <p.icon size={28} className="text-[var(--color-coral-500)]" />
              <h3 className="mt-6 font-display text-2xl tracking-tight">{p.title}</h3>
              <p className="mt-3 text-sm text-[var(--color-mute)]">{p.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
