import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Mail, MessageCircle, RefreshCw, ShieldAlert, X } from "lucide-react";
import { CONFIG } from "@/config";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Toaster } from "@/components/ui/sonner";
import { Legend, NumberGrid } from "@/components/raffle/NumberGrid";
import {
  AlertDialog,
  DonationDialog,
  PaidDialog,
  PaymentBlock,
  ReserveDialog,
  reserveToast,
} from "@/components/raffle/Dialogs";
import {
  cop,
  fetchNumbers,
  isClosed,
  mailLink,
  raffleStatus,
  waLink,
  type RaffleNumber,
} from "@/lib/raffle";

const TITLE = "El Destino y la Voluntad — Iniciativa solidaria";
const DESC =
  "Rifa solidaria con reglas claras, aportes voluntarios y servicios profesionales. Pagos manuales por Bre-B verificados por el organizador.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Section({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mx-auto max-w-4xl px-4 py-10">
      <h2 className="mb-5 text-center font-serif text-2xl font-bold text-gold md:text-3xl">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Index() {
  const q = useQuery({
    queryKey: ["numbers"],
    queryFn: fetchNumbers,
    refetchInterval: 60_000,
    retry: 1,
  });
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const [reserve, setReserve] = useState<number[]>([]);
  const [reserveOpen, setReserveOpen] = useState(false);
  const [alertN, setAlertN] = useState<number | null>(null);
  const [paidN, setPaidN] = useState<number | null>(null);
  const [donate, setDonate] = useState(false);

  const numbers: RaffleNumber[] =
    q.data ?? Array.from({ length: 100 }, (_, n) => ({ numero: n, state: "DISPONIBLE" as const }));
  const paid = q.data ? q.data.filter((n) => n.state === "PAGADO_VERIFICADO").length : 0;
  const raised = paid * CONFIG.TICKET_PRICE;
  const pct = Math.min(100, Math.round((raised / CONFIG.MIN_ACTIVATION_AMOUNT) * 100));
  const closed = now ? isClosed(now) : false;
  const status = raffleStatus(paid, now ?? new Date(0));

  const pick = (n: RaffleNumber) => {
    if (n.state === "PAGADO_VERIFICADO") return setPaidN(n.numero);
    if (n.state === "RESERVADO") return setAlertN(n.numero);
    if (closed) return;
    setReserve((current) =>
      current.includes(n.numero)
        ? current.filter((value) => value !== n.numero)
        : [...current, n.numero].sort((a, b) => a - b),
    );
  };

  return (
    <main className="min-h-screen pb-16 antialiased">
      <Toaster position="top-center" />
      <header className="mx-auto max-w-4xl px-4 pt-12 text-center">
        <p className="mb-6 inline-flex items-center gap-2 border border-gold/30 bg-gold/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-gold">
          <span className="inline-block h-1.5 w-1.5 rotate-45 bg-gold" aria-hidden />
          Iniciativa de apoyo y fraternidad
          <span className="inline-block h-1.5 w-1.5 rotate-45 bg-gold" aria-hidden />
        </p>
        <h1 className="gold-glow mb-4 font-serif text-3xl font-bold leading-tight tracking-tight md:text-5xl">
          El destino lanzó una carta inesperada.
          <br />
          <span className="font-normal italic text-gold">La voluntad compartida responde.</span>
        </h1>
        <p className="mx-auto mb-4 max-w-2xl text-base font-light leading-relaxed text-muted-foreground md:text-lg">
          Un robo violento afectó temporalmente nuestra capacidad para cubrir gastos esenciales del
          hogar, especialmente arriendo y alimentación. Esta iniciativa, dirigida a personas
          cercanas, busca atravesar la contingencia con transparencia y dignidad.
        </p>
        <p className="mx-auto max-w-2xl font-serif text-sm text-gold/90">
          La suerte puede elegir un número. La confianza se construye de otra manera: con reglas
          claras, pagos verificables y comunicación directa.
        </p>
        <nav className="mt-8 flex flex-wrap justify-center gap-3" aria-label="Modalidades">
          <Button asChild size="lg">
            <a href="#rifa">Rifa solidaria</a>
          </Button>
          <Button size="lg" variant="outline" onClick={() => setDonate(true)}>
            Aportar sin entrar en el sorteo
          </Button>
          <Button asChild size="lg" variant="outline">
            <a href="#servicios">Servicios solidarios</a>
          </Button>
        </nav>
      </header>

      {/* Panel financiero */}
      <section className="mx-auto mt-10 max-w-4xl px-4" aria-label="Estado de la rifa">
        <div className="ceremonial grid grid-cols-2 gap-4 p-5 md:grid-cols-4">
          <Stat label="Pagos verificados" value={q.data ? `${paid}/100` : "—"} />
          <Stat label="Recaudado por números" value={q.data ? cop(raised) : "—"} />
          <Stat
            label="Mínimo de activación"
            value={`${CONFIG.MIN_ACTIVATION_NUMBERS} números · ${cop(CONFIG.MIN_ACTIVATION_AMOUNT)}`}
          />
          <Stat label="Estado" value={q.data ? status : "Sin datos"} />
          <div className="col-span-2 md:col-span-4">
            <Progress
              value={pct}
              aria-label={`Activación al ${pct}%`}
              className="h-2 bg-muted [&>div]:bg-gold"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              {pct}% del mínimo. Solo se cuentan pagos verificados manualmente por el organizador.
              Los aportes voluntarios no suman aquí.
            </p>
          </div>
        </div>
      </section>

      <Section id="rifa" title="Elige tu número">
        <div className="mb-4 space-y-3 text-center text-sm text-muted-foreground">
          <p>
            {cop(CONFIG.TICKET_PRICE)} por número · Premio único {cop(CONFIG.PRIZE)} · Cierre:{" "}
            {CONFIG.FINAL_CUTOFF_LABEL} (hora de Colombia)
          </p>
          <Legend />
        </div>
        {q.isError && (
          <div
            role="alert"
            className="mb-4 border border-destructive/50 bg-destructive/10 p-4 text-sm"
          >
            No pudimos consultar el estado actualizado de los números. No reserves a ciegas:
            escríbenos por{" "}
            <a
              className="underline"
              href={waLink(
                CONFIG.ORGANIZER_WHATSAPP,
                "Hola. Quiero reservar un número de la rifa.",
              )}
              target="_blank"
              rel="noopener noreferrer"
            >
              WhatsApp
            </a>{" "}
            para confirmar disponibilidad.
            <Button size="sm" variant="outline" className="ml-2" onClick={() => q.refetch()}>
              <RefreshCw className="mr-1 h-3 w-3" />
              Reintentar
            </Button>
          </div>
        )}
        {closed && (
          <p role="status" className="mb-4 border border-gold/40 p-3 text-center text-sm">
            El cierre definitivo ya pasó. No se aceptan nuevas reservas ni pagos para participar.
          </p>
        )}
        <div
          aria-busy={q.isLoading}
          className={q.isLoading || q.isError ? "pointer-events-none opacity-40" : ""}
        >
          <NumberGrid numbers={numbers} onPick={pick} selected={reserve} />
        </div>
        {reserve.length > 0 && (
          <div className="sticky bottom-4 z-10 mt-5 flex flex-wrap items-center justify-between gap-3 border border-gold/50 bg-background/95 p-4 shadow-lg backdrop-blur">
            <div>
              <p className="font-semibold text-gold">
                {reserve.length} número{reserve.length === 1 ? "" : "s"} seleccionado
                {reserve.length === 1 ? "" : "s"}
              </p>
              <p className="text-sm text-muted-foreground">
                {reserve.map((n) => String(n).padStart(2, "0")).join(", ")} · Total:{" "}
                {cop(reserve.length * CONFIG.TICKET_PRICE)}
              </p>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setReserve([])}>
                <X className="mr-1 h-4 w-4" /> Limpiar
              </Button>
              <Button type="button" onClick={() => setReserveOpen(true)}>
                Continuar con la selección
              </Button>
            </div>
          </div>
        )}
      </Section>

      <Section title="Cómo participar" id="pago">
        <div className="ceremonial p-6">
          <p className="mb-4 text-center text-sm text-muted-foreground">
            Cuando el tablero confirme que un número está disponible, puedes reservarlo y realizar
            la transferencia manual. El número solo participa después de que el pago completo sea
            verificado.
          </p>
          <PaymentBlock amountLabel={cop(CONFIG.TICKET_PRICE)} />
        </div>
      </Section>

      <Section title="Regla esencial">
        <div className="ceremonial border-l-4 p-5 text-base leading-relaxed">
          <p className="font-semibold">
            Solo participan números cuyo valor total aparezca como pagado y verificado antes del
            cierre.
          </p>
          <p className="mt-2">
            Si las dos últimas cifras del premio mayor corresponden a un número libre, reservado,
            pendiente o impago, <strong className="text-gold">no se entrega el premio</strong>. No
            hay ganador alternativo, no se recorre al siguiente número y no se hace un segundo
            sorteo.
          </p>
        </div>
      </Section>

      <Section title="Condiciones completas">
        <ol className="ceremonial list-decimal space-y-2 p-6 pl-10 text-sm leading-relaxed text-muted-foreground">
          <li>
            Números del 00 al 99 (100 en total). Precio: {cop(CONFIG.TICKET_PRICE)} por número. No
            hay promociones.
          </li>
          <li>Premio único: {cop(CONFIG.PRIZE)} COP.</li>
          <li>
            Sorteo de referencia: {CONFIG.DRAW_REFERENCE}, del {CONFIG.DRAW_DATE_LABEL}. Se usan las
            dos últimas cifras del premio mayor.
          </li>
          <li>
            La Lotería de Bogotá no organiza ni administra esta iniciativa; su resultado se usa
            únicamente como referencia pública previamente anunciada.
          </li>
          <li>
            Activación mínima: la rifa solo se activa si se venden y pagan completamente al menos{" "}
            {CONFIG.MIN_ACTIVATION_NUMBERS} números, equivalentes a{" "}
            {cop(CONFIG.MIN_ACTIVATION_AMOUNT)}. Saldo mínimo esperado después del premio:{" "}
            {cop(CONFIG.MIN_ACTIVATION_AMOUNT - CONFIG.PRIZE)}.
          </li>
          <li>
            Si al cierre no se alcanza el mínimo: la rifa no se activa, no se realiza el sorteo, no
            se anuncia ganador y se coordina la devolución de los pagos verificados con cada
            participante. Los aportes voluntarios son independientes y no se convierten en pagos de
            números.
          </li>
          <li>
            Una reserva dura máximo {CONFIG.RESERVATION_HOURS} horas y no es una participación. Si
            el pago no se verifica en ese plazo, el número vuelve a estar disponible.
          </li>
          <li>
            Cierre definitivo: {CONFIG.FINAL_CUTOFF_LABEL} (America/Bogota), 48 horas antes del
            sorteo. Después no se aceptan reservas ni pagos para participar; toda reserva impaga se
            libera.
          </li>
          <li>
            Solo el organizador puede marcar un número como pagado y verificado, tras comprobar la
            transferencia en la cuenta.
          </li>
          <li>
            Regla esencial: si el número ganador no está totalmente pagado y verificado, no se
            entrega el premio, sin ganador alternativo ni segundo sorteo.
          </li>
        </ol>
      </Section>

      <Section title="Aporte voluntario">
        <div className="ceremonial p-6 text-center">
          <p className="mb-4 text-muted-foreground">
            Si prefieres apoyar sin participar, puedes hacer un aporte de cualquier valor. No compra
            un número, no activa la rifa y no participa en el sorteo.
          </p>
          <Button size="lg" onClick={() => setDonate(true)}>
            Aportar sin entrar en el sorteo
          </Button>
        </div>
      </Section>

      <Section id="servicios" title="El intercambio también ayuda">
        <div className="ceremonial space-y-4 p-6 text-muted-foreground">
          <p>
            Si prefieres apoyar recibiendo algo concreto a cambio, ofrezco servicios de traducción
            español–inglés, hojas de vida bilingües, plantillas editables y mini-webs creadas con
            apoyo de inteligencia artificial.
          </p>
          <p>
            Aquí no interviene el azar: se acuerdan previamente el servicio, el alcance, el precio y
            el plazo de entrega.
          </p>
          <p>
            Esta web también es una muestra real de mis capacidades: diseño, redacción, lógica de
            formularios, integración con servicios gratuitos y desarrollo asistido por inteligencia
            artificial. Puedes conocer mejor mi trayectoria y mi trabajo en mi portafolio
            profesional.
          </p>
          <ul className="grid gap-2 text-sm sm:grid-cols-2">
            {[
              "No depende del azar.",
              "No incluye números de la rifa.",
              "No es una donación disfrazada.",
              "Intercambio directo: alcance, precio y plazo acordados.",
            ].map((t) => (
              <li key={t} className="flex gap-2">
                <span
                  className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rotate-45 bg-gold"
                  aria-hidden
                />
                {t}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <a href={CONFIG.PORTFOLIO_URL} target="_blank" rel="noopener noreferrer">
                Conocer mi portafolio y trayectoria
              </a>
            </Button>
            <Button asChild variant="outline">
              <a
                href={mailLink(
                  CONFIG.ORGANIZER_EMAIL,
                  "Consulta de servicio solidario",
                  "Hola Diego. Me interesa el servicio de: \nAlcance aproximado: \nPlazo deseado: ",
                )}
              >
                Consultar un servicio
              </a>
            </Button>
          </div>
        </div>
      </Section>

      <Section title="Si algo no encaja, escríbenos">
        <div className="ceremonial space-y-4 p-6 text-center">
          <p className="text-muted-foreground">
            Para errores, reservas duplicadas, dificultades de pago o cualquier percance, puedes
            comunicarte directamente con el organizador.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild>
              <a
                href={waLink(
                  CONFIG.ORGANIZER_WHATSAPP,
                  "Hola. Te escribo por la iniciativa El Destino y la Voluntad.",
                )}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                Escribir por WhatsApp
              </a>
            </Button>
            <Button asChild variant="outline">
              <a href={mailLink(CONFIG.ORGANIZER_EMAIL, "El Destino y la Voluntad")}>
                <Mail className="mr-2 h-4 w-4" />
                Enviar correo
              </a>
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            +{CONFIG.ORGANIZER_WHATSAPP} · {CONFIG.ORGANIZER_EMAIL}
          </p>
          <p className="flex items-center justify-center gap-2 text-sm text-gold">
            <ShieldAlert className="h-4 w-4" />
            Nunca solicitaremos claves bancarias, códigos de seguridad ni datos completos de
            tarjetas.
          </p>
        </div>
      </Section>

      <footer className="mx-auto max-w-3xl space-y-3 px-4 pt-6 text-center text-xs text-muted-foreground">
        <p>
          Privacidad: usaremos los datos únicamente para gestionar reservas, verificar pagos, enviar
          alertas solicitadas y contactar sobre la iniciativa. No publicaremos nombres, teléfonos ni
          correos de los participantes.
        </p>
        <p className="font-serif text-sm text-gold">
          Una estética de epopeya; unas reglas de cristal.
        </p>
      </footer>

      <ReserveDialog
        numeros={reserve}
        open={reserveOpen}
        onClose={() => setReserveOpen(false)}
        onDone={(r, n, exp) => {
          reserveToast(r, n, exp);
          void q.refetch();
          if (r.kind === "SUCCESS" || r.kind === "TAKEN") {
            setReserve((current) => current.filter((value) => value !== n));
          }
        }}
      />
      <AlertDialog numero={alertN} onClose={() => setAlertN(null)} />
      <PaidDialog numero={paidN} onClose={() => setPaidN(null)} />
      <DonationDialog open={donate} onClose={() => setDonate(false)} />
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-serif text-lg font-bold text-foreground md:text-xl">{value}</p>
    </div>
  );
}
