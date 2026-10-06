import { CONFIG } from "@/config";

export type NumberState = "DISPONIBLE" | "RESERVADO" | "PAGADO_VERIFICADO";
export type RaffleNumber = { numero: number; state: NumberState };

/** 7 → "07". Internamente siempre se usa el entero. */
export const pad = (n: number) => String(n).padStart(2, "0");

export const cop = (v: number) =>
  "$" + new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(v);

/** Mapea los estados de la hoja (actuales y propuestos) a los 3 estados visibles. */
export function mapState(raw: unknown): NumberState {
  const s = String(raw ?? "")
    .trim()
    .toUpperCase();
  if (s === "PAGADO_VERIFICADO" || s === "PAGADO") return "PAGADO_VERIFICADO";
  if (s === "PENDIENTE" || s === "RESERVADO") return "RESERVADO";
  return "DISPONIBLE"; // LIBRE, LIBERADO, DISPONIBLE o vacío
}

export async function fetchNumbers(): Promise<RaffleNumber[]> {
  const res = await fetch(CONFIG.SCRIPT_URL, { redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data: unknown = await res.json();
  if (!Array.isArray(data)) throw new Error("Formato inesperado");
  const map = new Map<number, NumberState>();
  for (const row of data as { numero?: unknown; estado?: unknown }[]) {
    const n = Number(row?.numero);
    if (Number.isInteger(n) && n >= 0 && n <= 99) map.set(n, mapState(row.estado));
  }
  return Array.from({ length: 100 }, (_, n) => ({ numero: n, state: map.get(n) ?? "DISPONIBLE" }));
}

export type PostResult =
  | { kind: "SUCCESS" }
  | { kind: "TAKEN" }
  | { kind: "ERROR"; message?: string | undefined }
  | { kind: "UNCONFIRMED" };

/** text/plain evita el preflight CORS; Apps Script lee e.postData.contents. */
export async function postToScript(payload: Record<string, unknown>): Promise<PostResult> {
  try {
    const res = await fetch(CONFIG.SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
      redirect: "follow",
    });
    const json = (await res.json()) as { status?: string; message?: string };
    if (json.status === "SUCCESS") return { kind: "SUCCESS" };
    if (json.status === "TAKEN") return { kind: "TAKEN" };
    if (json.status === "ERROR") return { kind: "ERROR", message: json.message };
    return { kind: "UNCONFIRMED" };
  } catch {
    return { kind: "UNCONFIRMED" };
  }
}

export const cutoffDate = () => new Date(CONFIG.FINAL_CUTOFF);
export const isClosed = (now = new Date()) => now >= cutoffDate();

/** Vence a las 12 h o en el cierre definitivo, lo que ocurra primero. */
export function reservationExpiry(now = new Date()) {
  const exp = new Date(now.getTime() + CONFIG.RESERVATION_HOURS * 3600_000);
  return exp > cutoffDate() ? cutoffDate() : exp;
}

export const bogota = (d: Date) =>
  new Intl.DateTimeFormat("es-CO", {
    timeZone: CONFIG.TIMEZONE,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);

export type RaffleStatus = "Pendiente de activación" | "Activada" | "Cerrada" | "No activada";
export function raffleStatus(paidCount: number, now = new Date()): RaffleStatus {
  const reached = paidCount * CONFIG.TICKET_PRICE >= CONFIG.MIN_ACTIVATION_AMOUNT;
  if (isClosed(now)) return reached ? "Cerrada" : "No activada";
  return reached ? "Activada" : "Pendiente de activación";
}

export const waLink = (phone: string, text: string) =>
  `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
export const mailLink = (to: string, subject: string, body = "") =>
  `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
