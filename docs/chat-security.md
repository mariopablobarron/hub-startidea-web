# Seguridad de persistencia del chat

El identificador de conversación es un identificador, no una ruta.

- Si el cliente no lo envía, el servidor genera un UUID v4.
- Si el cliente lo envía, sólo se acepta un UUID v4 canónico; separadores,
  puntos, escapes y cualquier otro formato reciben `400` antes de consumir
  cuota del proveedor o escribir en GitHub.
- La capa de persistencia vuelve a validar el identificador y construye la ruta
  con semántica POSIX. Antes de llamar a GitHub comprueba que el archivo final
  es exactamente `data/conversations/YYYY-MM-DD/<uuid>.json`.
- El token de GitHub debe conservar el mínimo alcance posible sobre este
  repositorio. Su rotación o separación es una operación de infraestructura,
  independiente de esta barrera de aplicación.
