// Configuración central de la iniciativa. Cambia los valores aquí (o con
// variables VITE_* en .env). Ningún valor de este archivo es secreto.
const env = import.meta.env;

export const CONFIG = {
  SCRIPT_URL:
    env["VITE_SCRIPT_URL"] ??
    "https://script.google.com/macros/s/AKfycbwK37WKuV0s87hqEW8fPdQEpUf45yszWnAJjvkuWn6H6HCf9I0jgKhED2onAnM0B7kfrQ/exec",
  // true solo cuando el Apps Script propuesto (docs/apps-script-propuesto.gs)
  // esté desplegado: habilita ALERTA_DISPONIBILIDAD, APORTE_VOLUNTARIO y CONSULTA_SERVICIO.
  SCRIPT_SUPPORTS_EXTENDED: (env["VITE_SCRIPT_SUPPORTS_EXTENDED"] ?? "false") === "true",
  ORGANIZER_WHATSAPP: env["VITE_ORGANIZER_WHATSAPP"] ?? "573133339924",
  // Preparado para notificaciones internas; no se muestra públicamente.
  SECONDARY_CONTACT_WHATSAPP: env["VITE_SECONDARY_CONTACT_WHATSAPP"] ?? "573150660239",
  ORGANIZER_EMAIL: env["VITE_ORGANIZER_EMAIL"] ?? "mendiar88@gmail.com",
  PORTFOLIO_URL: "https://mendiar.github.io/cv/",
  BREB_KEY: env["VITE_BREB_KEY"] ?? "1023870980",
  BREB_KEY_TYPE: "Número de identificación",
  BREB_BANK: "BBVA",
  BREB_HOLDER_NAME: env["VITE_BREB_HOLDER_NAME"] ?? "Diego Armando Méndez",
  DRAW_DATE: "2026-10-15",
  DRAW_DATE_LABEL: "jueves 15 de octubre de 2026",
  DRAW_REFERENCE: "Lotería de Bogotá, sorteo número 2868",
  FINAL_CUTOFF: "2026-10-15T19:00:00-05:00",
  FINAL_CUTOFF_LABEL: "jueves 15 de octubre de 2026 a las 7:00 p. m.",
  TIMEZONE: "America/Bogota",
  TICKET_PRICE: 20_000,
  PRIZE: 500_000,
  MIN_ACTIVATION_NUMBERS: 52,
  MIN_ACTIVATION_AMOUNT: 1_040_000,
  RESERVATION_HOURS: 12,
  TOTAL_NUMBERS: 100,
} as const;
