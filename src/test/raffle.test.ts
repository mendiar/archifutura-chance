import { describe, expect, it } from "vitest";
import { CONFIG } from "@/config";
import { isClosed, mapState, raffleStatus, reservationExpiry } from "@/lib/raffle";

describe("reglas de la tómbola", () => {
  it("normaliza los estados del backend", () => {
    expect(mapState("LIBRE")).toBe("DISPONIBLE");
    expect(mapState("PENDIENTE")).toBe("RESERVADO");
    expect(mapState("RESERVADO")).toBe("RESERVADO");
    expect(mapState("PAGADO")).toBe("PAGADO_VERIFICADO");
    expect(mapState("PAGADO_VERIFICADO")).toBe("PAGADO_VERIFICADO");
  });

  it("exige 52 pagos verificados para activar la tómbola", () => {
    expect(raffleStatus(51, new Date("2026-10-10T12:00:00-05:00"))).toBe("Pendiente de activación");
    expect(raffleStatus(52, new Date("2026-10-10T12:00:00-05:00"))).toBe("Activada");
  });

  it("cierra y marca como no activada cuando no se alcanza el mínimo", () => {
    const afterCutoff = new Date("2026-10-14T00:00:00-05:00");
    expect(isClosed(afterCutoff)).toBe(true);
    expect(raffleStatus(51, afterCutoff)).toBe("No activada");
    expect(raffleStatus(52, afterCutoff)).toBe("Cerrada");
  });

  it("limita la reserva al cierre definitivo", () => {
    const beforeCutoff = new Date("2026-10-13T22:00:00-05:00");
    expect(reservationExpiry(beforeCutoff).getTime()).toBe(new Date(CONFIG.FINAL_CUTOFF).getTime());
  });
});
