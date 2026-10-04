import { cn } from "@/lib/utils";
import { pad, type RaffleNumber, type NumberState } from "@/lib/raffle";

const LABEL: Record<NumberState, string> = {
  DISPONIBLE: "Disponible",
  RESERVADO: "Reserva pendiente",
  PAGADO_VERIFICADO: "Pago verificado; participa",
};

const STYLE: Record<NumberState, string> = {
  DISPONIBLE: "border-available/60 text-available hover:bg-available/15",
  RESERVADO: "border-reserved/60 bg-reserved/10 text-reserved border-dashed",
  PAGADO_VERIFICADO: "border-paid/70 bg-paid/20 text-paid line-through decoration-2",
};

export function Legend() {
  return (
    <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm">
      {(Object.keys(LABEL) as NumberState[]).map((s) => (
        <li key={s} className="flex items-center gap-2">
          <span className={cn("inline-block h-4 w-4 border", STYLE[s])} aria-hidden />
          {LABEL[s]}
        </li>
      ))}
    </ul>
  );
}

export function NumberGrid({
  numbers,
  onPick,
}: {
  numbers: RaffleNumber[];
  onPick: (n: RaffleNumber) => void;
}) {
  return (
    <div
      className="grid grid-cols-5 gap-2 sm:grid-cols-10"
      role="list"
      aria-label="Números de la rifa del 00 al 99"
    >
      {numbers.map((n) => (
        <button
          key={n.numero}
          role="listitem"
          type="button"
          onClick={() => onPick(n)}
          aria-label={`Número ${pad(n.numero)}: ${LABEL[n.state]}`}
          className={cn(
            "flex h-12 items-center justify-center border font-serif text-lg font-bold transition-colors focus-visible:outline-2 focus-visible:outline-ring",
            STYLE[n.state],
          )}
        >
          {pad(n.numero)}
        </button>
      ))}
    </div>
  );
}
