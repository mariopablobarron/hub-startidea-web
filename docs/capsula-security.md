# Seguridad de Cápsula

La experiencia mantiene dos fronteras distintas:

- El entrevistador (`/capsula?host=1`) y las operaciones de Spotify, voces,
  sesión y copiloto requieren una sesión `ADMIN`.
- El invitado puede abrir `/capsula` sin cuenta, pero no obtiene acceso a las
  APIs. Al conectar, el host acuña una capacidad HMAC y se la entrega por el
  canal WebRTC. El navegador invitado la cambia por una cookie `HttpOnly`,
  `SameSite=Strict`, limitada a `/api/capsula`.

La capacidad dura como máximo dos horas, queda ligada a la sala y sólo permite
`tts`, `recording:create` y `music:read`. No autoriza el copiloto, Spotify, el
listado de voces ni datos de sesiones. TTS limita solicitudes y caracteres;
las grabaciones limitan cantidad y bytes acumulados por capacidad.

`Origin` o `Referer` se comparan por origen exacto únicamente como defensa
CSRF en operaciones mutables. Esas cabeceras nunca conceden identidad ni
permisos por sí solas.

La firma reutiliza `AUTH_SECRET` con separación de dominio. La cuota vive en
memoria y cubre el despliegue actual de una sola réplica; si Cápsula escala a
varias réplicas, debe trasladarse a un almacén compartido antes de ampliar el
tráfico.
