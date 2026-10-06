# El Destino y la Voluntad

Iniciativa solidaria privada con tres modalidades separadas: rifa, aportes voluntarios y venta de servicios. Pago manual por Bre-B; verificación manual del organizador.

## Arquitectura

- Frontend: TanStack Start + React + Tailwind v4 (`src/routes/index.tsx`, `src/components/raffle/*`).
- Configuración única: `src/config.ts` (sobrescribible con `VITE_*`, ver `.env.example`).
- Datos: Google Sheets vía Apps Script (endpoint `SCRIPT_URL`). Lógica cliente en `src/lib/raffle.ts`.

## Variables

`SCRIPT_URL`, `SCRIPT_SUPPORTS_EXTENDED`, `ORGANIZER_WHATSAPP`, `SECONDARY_CONTACT_WHATSAPP`, `ORGANIZER_EMAIL`, `BREB_KEY`, `BREB_HOLDER_NAME`, `DRAW_DATE`, `DRAW_REFERENCE`, `FINAL_CUTOFF`, `MIN_ACTIVATION_AMOUNT`.

## Apps Script

El script actual tiene `doGet`/`doPost` anidados dentro de `myFunction()`, por lo que el endpoint no los expone, y la implementación actual redirige al inicio de sesión de Google (acceso no público). Propuesta compatible en `docs/apps-script-propuesto.gs` (misma respuesta `[{numero, estado}]` y `{status: SUCCESS|TAKEN|ERROR}`). Desplegar como aplicación web con acceso "Cualquier usuario" y poner `VITE_SCRIPT_SUPPORTS_EXTENDED=true`.

El script propuesto ahora busca el número por su valor en la columna `NUMERO`, en vez de asumir que el número siempre coincide con la fila. Esto permite ordenar la hoja sin desalinear los números. Antes de activar el frontend extendido, probar desde una ventana privada un `GET`, una reserva de prueba, una alerta y un aporte.

## Hoja

Principal: `NUMERO, ESTADO, NOMBRE, TELEFONO` + `VALOR, FECHA_RESERVA, FECHA_VENCIMIENTO, FECHA_PAGO_VERIFICADO, CORREO, OBSERVACIONES`. Estados: `LIBRE`, `PENDIENTE` (reserva), `PAGADO_VERIFICADO` (solo manual). Números como enteros 0–99; la web los muestra como 00–99.
Pestañas: `ALERTAS (NUMERO, CORREO, FECHA_SOLICITUD, ESTADO, FECHA_AVISO)`, `APORTES (FECHA, NOMBRE, CONTACTO, VALOR_DECLARADO, ESTADO, OBSERVACIONES)`, `SERVICIOS (FECHA, NOMBRE, CONTACTO, SERVICIO, ALCANCE, PRECIO, ESTADO)`.

## Reglas

00–99, $20.000 por número, premio $500.000, mínimo de activación de 52 números ($1.040.000, solo pagos verificados). Saldo mínimo esperado después del premio: $540.000. Sorteo: Lotería de Bogotá n.º 2868, 15/10/2026, dos últimas cifras del premio mayor. Cierre: 15/10/2026 7:00 p. m. America/Bogota. Reserva máx. 12 h. Si el número ganador no está pagado y verificado, no se entrega el premio.

## CORS

Los POST se envían como `text/plain` para evitar preflight; si la respuesta no puede leerse, la web no afirma éxito y muestra un mensaje de verificación pendiente.

## Seguridad

No se piden claves, códigos ni tarjetas. No se exponen nombres/teléfonos/correos. No hay panel admin público: la verificación de pagos se hace en la hoja.

El QR debe incorporarse como archivo de imagen real en el repositorio/despliegue. El archivo `.asset.json` que genera Lovable es una referencia interna y puede no funcionar fuera de Lovable. Conserva el QR original como `src/assets/qr-breb.jpg` o adapta el import a un archivo servido desde `public/`.

El registro de aportes espera la respuesta del endpoint antes de mostrar que fue registrado. Si el backend no está disponible, el usuario recibe una instrucción para notificar por WhatsApp o correo.

## Despliegue

Conectar GitHub desde Lovable (Conectores → GitHub) y publicar desde Lovable.

Antes de publicar, ejecutar `npm run build`, `npm run lint` y `npm run test`. Configurar `VITE_SCRIPT_URL` con la nueva implementación pública de Apps Script y usar `VITE_SCRIPT_SUPPORTS_EXTENDED=true` únicamente después de probar las funciones extendidas.
