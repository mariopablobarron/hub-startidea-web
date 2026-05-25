# Optimización de imágenes

Cuando lleguen las fotos reales de las salas, ejecutar este pipeline.

## Setup (una vez)

```bash
brew install mozjpeg jpegoptim webp
```

## Pipeline

```bash
cd public/images

# 1. Hero — full bleed, max 1920px ancho, quality 78
mozjpeg-cjpeg -quality 78 -progressive < hero-granada.jpg > hero-granada.optim.jpg
mv hero-granada.optim.jpg hero-granada.jpg

# 2. Salas — max 1600px ancho, quality 78, progressive
for f in rooms/*.jpg; do
  mozjpeg-cjpeg -quality 78 -progressive < "$f" > "${f}.optim"
  mv "${f}.optim" "$f"
done

# 3. WebP paralelo (opcional — solo si vamos a quitar next.config.images.unoptimized:true)
for f in hero-granada.jpg rooms/*.jpg; do
  cwebp -q 80 "$f" -o "${f%.jpg}.webp"
done
```

## Verificación

Tamaños objetivo:
- Hero: ≤200KB (era 663KB original)
- Salas horizontales 1600×1067: ≤120KB (eran 180-380KB)
- Salas verticales 1600×2400: ≤180KB (eran 314-616KB)

Total esperado tras optim: ~1.2MB (era 3MB) sin perder calidad visual.

## Si queremos Next.js Image optimization completo

Editar `next.config.ts` quitando `images.unoptimized: true`. Requiere
`sharp` en runtime, y como el Docker base es alpine:

```dockerfile
RUN apk add --no-cache vips-dev
RUN pnpm add sharp
```

Coolify hará rebuild. Ojo: el bundle de sharp+vips suma ~50MB al image.

## Cuándo hacerlo

- **Ahora**: nada, placeholders no merecen la pena
- **Cuando lleguen fotos reales**: paso 1+2 + commit
- **Cuando lleguemos a 1k visitas/día**: evaluar paso 3 + sharp
