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

## Hoja
Principal: `NUMERO, ESTADO, NOMBRE, TELEFONO` + `VALOR, FECHA_RESERVA, FECHA_VENCIMIENTO, FECHA_PAGO_VERIFICADO, CORREO, OBSERVACIONES`. Estados: `LIBRE`, `PENDIENTE` (reserva), `PAGADO_VERIFICADO` (solo manual). Números como enteros 0–99; la web los muestra como 00–99.
Pestañas: `ALERTAS (NUMERO, CORREO, FECHA_SOLICITUD, ESTADO, FECHA_AVISO)`, `APORTES (FECHA, NOMBRE, CONTACTO, VALOR_DECLARADO, ESTADO, OBSERVACIONES)`, `SERVICIOS (FECHA, NOMBRE, CONTACTO, SERVICIO, ALCANCE, PRECIO, ESTADO)`.

## Reglas
00–99, $10.000 por número, premio $200.000, mínimo de activación $730.000 (solo pagos verificados). Sorteo: Lotería de Bogotá n.º 2868, 15/10/2026, dos últimas cifras del premio mayor. Cierre: 13/10/2026 11:59 p. m. America/Bogota. Reserva máx. 3 h. Si el número ganador no está pagado y verificado, no se entrega el premio.

## CORS
Los POST se envían como `text/plain` para evitar preflight; si la respuesta no puede leerse, la web no afirma éxito y muestra un mensaje de verificación pendiente.

## Seguridad
No se piden claves, códigos ni tarjetas. No se exponen nombres/teléfonos/correos. No hay panel admin público: la verificación de pagos se hace en la hoja.

## Despliegue
Conectar GitHub desde Lovable (Conectores → GitHub) y publicar desde Lovable.
