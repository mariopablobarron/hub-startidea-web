import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "./auth.config";

/**
 * Patrones de paths que devuelven 410 Gone directamente desde el edge.
 * Los bots de scraping de sitios de casino han descubierto el dominio y
 * pinguean URLs aleatorias buscando si somos una web de apuestas. Al
 * devolver 410 + X-Robots-Tag noindex, los bots educados (Googlebot,
 * archiver) saben que no hay nada aquí y dejan de venir; los maliciosos
 * siguen pegando pero ya no tocan el render Next (ahorra CPU + RAM) y
 * no aparecen en Umami (porque el script no se carga en una 410).
 *
 * Importante: estos patrones son SUFICIENTEMENTE específicos como para
 * NO bloquear contenido legítimo del HUB. Si en el futuro queremos
 * hablar de "casinos online como modelo de negocio" en un blog post,
 * se reescriben con regex más estrictas (e.g. /\/casinos-? / con espacio
 * obligatorio al final del path).
 */
const SPAM_PATH_PATTERNS: RegExp[] = [
  /casino/i,
  /\bjuega-gratis/i,
  /modo-demo/i,
  /wild-chapo/i,
  /return-of-kong/i,
  /megaways/i,
  /tragaperras/i,
  /crupier|croupier/i,
  /blackjack/i,
  /apuestas-deportivas/i,
  /\bslot[-_s]/i,
  /\bbet-?365/i,
];

function isSpamPath(path: string): boolean {
  return SPAM_PATH_PATTERNS.some((re) => re.test(path));
}

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const path = req.nextUrl.pathname;

  // 1. Filtro anti-spam ANTES de cualquier otra cosa. Edge runtime,
  //    ~1ms de coste, no toca render ni BD.
  if (isSpamPath(path)) {
    return new NextResponse("410 — URL bloqueada (no estamos en ese negocio)", {
      status: 410,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Robots-Tag": "noindex, nofollow, noarchive",
        "Cache-Control": "public, max-age=86400",
      },
    });
  }

  // 2. NextAuth callback `authorized` decide el resto (protege /admin
  //    y /me; deja todo lo demás pasar). Sin return explícito, el wrapper
  //    de auth() ejecuta la lógica de authConfig automáticamente.
  return undefined;
});

export const config = {
  // Matcher amplio: TODO excepto assets internos. El middleware mismo
  // filtra qué hace según el path. Imágenes/JS/CSS no pagan el coste
  // (el matcher excluye `_next/static`, `_next/image`, favicons y
  // cualquier path con extensión típica de asset).
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|images/|.*\\.(?:jpg|jpeg|png|webp|svg|ico|gif|woff2?|ttf|css|js|map)$).*)",
  ],
};
