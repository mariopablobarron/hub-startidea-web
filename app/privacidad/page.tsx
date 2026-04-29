import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description: "Cómo tratamos tus datos en hubstartidea.es",
};

export default function PrivacidadPage() {
  return (
    <div className="container-page py-24 md:py-32">
      <article className="prose mx-auto max-w-3xl space-y-6 text-[var(--color-ink)]">
        <h1 className="font-display text-4xl tracking-tight md:text-5xl">Política de privacidad</h1>
        <p className="text-sm text-[var(--color-mute)]">Última actualización: abril 2026</p>

        <h2 className="font-display text-2xl">Quiénes somos</h2>
        <p>
          HUB Startidea es el espacio de coworking, formación y podcast operado por <strong>Startidea — Agencia de Innovación Social</strong>, con domicilio en C/ Conde Cifuentes 33, 18005 Granada. Para cualquier asunto relativo a esta política puedes escribirnos a{" "}
          <a className="text-[var(--color-coral-600)] underline" href="mailto:hola@hubstartidea.es">
            hola@hubstartidea.es
          </a>
          .
        </p>

        <h2 className="font-display text-2xl">Qué datos recogemos</h2>
        <ul className="list-disc pl-5">
          <li><strong>Formularios de contacto</strong>: nombre, email, teléfono y el mensaje que nos envías. Solo los usamos para responderte y, si das tu consentimiento, contarte novedades del HUB.</li>
          <li>
            <strong>Chatbot público</strong>: las conversaciones con nuestro asistente se almacenan asociadas a un identificador anónimo (hash de tu IP + navegador) durante un máximo de 12 meses. Usamos esos chats para mejorar las respuestas y entender qué necesita la comunidad. <strong>No</strong> usamos esos datos para identificarte ni se los pasamos a terceros para publicidad.
          </li>
          <li>
            <strong>Cookies técnicas</strong>: estrictamente las necesarias para que la web funcione (sesión, idioma). No usamos cookies publicitarias propias.
          </li>
          <li>
            <strong>Analítica</strong>: usamos servicios de analítica web para entender de dónde llega el tráfico y cómo se comporta. No vendemos esos datos a nadie.
          </li>
        </ul>

        <h2 className="font-display text-2xl">Quién procesa tus datos</h2>
        <p>Algunos servicios externos procesan datos por nuestra cuenta:</p>
        <ul className="list-disc pl-5">
          <li><strong>OpenRouter / Anthropic / OpenAI</strong>: el modelo de IA que responde el chat público corre en su infraestructura. Sus términos:{" "}
            <a className="text-[var(--color-coral-600)] underline" href="https://openrouter.ai/privacy" target="_blank" rel="noreferrer">openrouter.ai/privacy</a>.</li>
          <li><strong>GitHub (Microsoft)</strong>: alojamos el código y los registros de conversaciones en un repositorio privado.</li>
          <li><strong>Hostinger</strong>: nuestro servidor está alojado en sus instalaciones, en la UE.</li>
        </ul>

        <h2 className="font-display text-2xl">Cuánto tiempo conservamos tus datos</h2>
        <ul className="list-disc pl-5">
          <li>Mensajes del formulario de contacto: hasta 24 meses, salvo que sigamos en conversación contigo.</li>
          <li>Conversaciones del chatbot: hasta 12 meses.</li>
          <li>Si nos pides eliminarlos antes, lo hacemos en menos de 7 días desde tu solicitud.</li>
        </ul>

        <h2 className="font-display text-2xl">Tus derechos</h2>
        <p>
          Tienes derecho a acceder, rectificar, suprimir, oponerte y portar tus datos. Para ejercer cualquiera de estos derechos, escríbenos a{" "}
          <a className="text-[var(--color-coral-600)] underline" href="mailto:hola@hubstartidea.es">
            hola@hubstartidea.es
          </a>{" "}
          desde la dirección con la que te pusiste en contacto. Si crees que no hemos atendido tu petición correctamente, puedes reclamar ante la Agencia Española de Protección de Datos ({" "}
          <a className="text-[var(--color-coral-600)] underline" href="https://www.aepd.es" target="_blank" rel="noreferrer">www.aepd.es</a>
          ).
        </p>

        <h2 className="font-display text-2xl">Base jurídica</h2>
        <p>Tratamos tus datos en base a tu consentimiento (formulario, chat) o a nuestro interés legítimo en mantener una operativa de calidad y seguridad (analítica técnica).</p>
      </article>
    </div>
  );
}
