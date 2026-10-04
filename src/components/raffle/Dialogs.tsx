import { useState } from "react";
import { z } from "zod";
import { Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import qr from "@/assets/qr-breb.jpeg";
import { CONFIG } from "@/config";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  bogota,
  cop,
  isClosed,
  mailLink,
  pad,
  postToScript,
  reservationExpiry,
  waLink,
  type PostResult,
} from "@/lib/raffle";

const content = "max-h-[92vh] overflow-y-auto border-border bg-popover";

export function PaymentBlock({ amountLabel }: { amountLabel?: string }) {
  return (
    <div className="ceremonial space-y-3 p-4">
      <div className="flex gap-4">
        <img
          src={qr}
          alt="Código QR Bre-B de BBVA para transferir"
          className="h-32 w-32 shrink-0 bg-foreground object-cover object-[50%_45%]"
        />
        <dl className="space-y-1 text-sm">
          <dt className="text-muted-foreground">Llave Bre-B</dt>
          <dd className="flex items-center gap-2 font-mono text-lg font-semibold text-gold">
            {CONFIG.BREB_KEY}
            <button
              type="button"
              aria-label="Copiar llave"
              onClick={() =>
                navigator.clipboard
                  ?.writeText(CONFIG.BREB_KEY)
                  .then(() => toast.success("Llave copiada"))
              }
              className="text-muted-foreground hover:text-gold"
            >
              <Copy className="h-4 w-4" />
            </button>
          </dd>
          <dd className="text-muted-foreground">
            {CONFIG.BREB_KEY_TYPE} · {CONFIG.BREB_BANK}
          </dd>
          <dd>
            Titular: <strong>{CONFIG.BREB_HOLDER_NAME}</strong>
          </dd>
          {amountLabel && (
            <dd>
              Valor: <strong className="text-gold">{amountLabel}</strong>
            </dd>
          )}
        </dl>
      </div>
      <p className="text-xs text-muted-foreground">
        Antes de confirmar en tu banco, verifica que el titular coincida. Esta llave sirve
        únicamente para recibir transferencias. Nunca solicitaremos claves, códigos de seguridad,
        contraseñas ni datos completos de tarjetas.
      </p>
    </div>
  );
}

const reserveSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(2, "Escribe tu nombre o alias (mínimo 2 caracteres).")
    .max(60, "Máximo 60 caracteres."),
  telefono: z
    .string()
    .trim()
    .transform((v) => v.replace(/[\s()-]/g, ""))
    .refine((v) => /^\+?\d{10,13}$/.test(v), "Escribe un WhatsApp válido, por ejemplo 3001234567."),
  acepto: z.literal(true, { errorMap: () => ({ message: "Debes aceptar esta condición." }) }),
});

const UNCONFIRMED =
  "Solicitud enviada. La reserva queda pendiente de verificación. Si no ves confirmación o tienes dudas, escríbenos por WhatsApp o correo.";

export function ReserveDialog({
  numeros,
  open,
  onClose,
  onDone,
}: {
  numeros: number[];
  open: boolean;
  onClose: () => void;
  onDone: (r: PostResult, n: number, exp: Date) => void;
}) {
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [acepto, setAcepto] = useState(false);
  const [errors, setErrors] = useState<
    Partial<Record<"nombre" | "telefono" | "acepto" | "form", string>>
  >({});
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (numeros.length === 0) return;
    if (isClosed()) {
      setErrors({ form: "El cierre definitivo ya pasó. No se aceptan nuevas reservas." });
      return;
    }
    const parsed = reserveSchema.safeParse({ nombre, telefono, acepto });
    if (!parsed.success) {
      setErrors(
        Object.fromEntries(
          parsed.error.issues.map((i) => [String(i.path[0]), i.message]),
        ) as Record<string, string>,
      );
      return;
    }
    setErrors({});
    const win = window.open("about:blank", "_blank");
    setBusy(true);
    const now = new Date();
    const exp = reservationExpiry(now);
    const results: PostResult[] = [];
    for (const numero of numeros) {
      const result = await postToScript({
        tipo: "RESERVA",
        numero,
        nombre: parsed.data.nombre,
        telefono: parsed.data.telefono,
        valor: CONFIG.TICKET_PRICE,
        fechaReserva: now.toISOString(),
        fechaVencimiento: exp.toISOString(),
        estado: "RESERVADO",
      });
      results.push(result);
      onDone(result, numero, exp);
      if (result.kind === "ERROR" || result.kind === "UNCONFIRMED") break;
    }
    setBusy(false);

    const taken = numeros.filter((_, i) => results[i]?.kind === "TAKEN");
    const failed = results.some((r) => r.kind === "ERROR" || r.kind === "UNCONFIRMED");
    const confirmed = numeros.filter((_, i) => results[i]?.kind === "SUCCESS");
    if (failed) {
      win?.close();
      setErrors({
        form: `Se procesaron parcialmente tus números. ${taken.length ? `No disponibles: ${taken.map(pad).join(", ")}. ` : ""}Verifica el resultado por WhatsApp o correo.`,
      });
      return;
    }
    if (confirmed.length === 0) {
      win?.close();
      setErrors({
        form: `Los números ${taken.map(pad).join(", ")} ya fueron reservados. Elige otros.`,
      });
      return;
    }

    const msg =
      `Hola. Registré una reserva de los números ${confirmed.map(pad).join(", ")} en "El Destino y la Voluntad".\n` +
      `Nombre o alias: ${parsed.data.nombre}\n` +
      `Total: ${cop(confirmed.length * CONFIG.TICKET_PRICE)}\n` +
      `Adjunto el comprobante de transferencia Bre-B. Entiendo que los números participan solo cuando el pago sea verificado.`;
    const url = waLink(CONFIG.ORGANIZER_WHATSAPP, msg);
    if (win) win.location.href = url;
    else window.location.href = url;
    if (taken.length)
      setErrors({ form: `Reserva parcial. No disponibles: ${taken.map(pad).join(", ")}.` });
    setNombre("");
    setTelefono("");
    setAcepto(false);
  };

  const total = numeros.length * CONFIG.TICKET_PRICE;
  return (
    <Dialog open={open && numeros.length > 0} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className={content}>
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl text-gold">
            Reservar {numeros.length} número{numeros.length === 1 ? "" : "s"}
          </DialogTitle>
          <DialogDescription>
            Seleccionados: {numeros.map(pad).join(", ")} · Total: {cop(total)}. La reserva dura
            máximo {CONFIG.RESERVATION_HOURS} horas y no es una participación hasta que el pago sea
            verificado.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="r-nombre">Nombre o alias</Label>
            <Input
              id="r-nombre"
              value={nombre}
              maxLength={60}
              onChange={(e) => setNombre(e.target.value)}
              aria-invalid={!!errors["nombre"]}
              aria-describedby="r-nombre-err"
            />
            {errors["nombre"] && (
              <p id="r-nombre-err" className="text-sm text-destructive">
                {errors["nombre"]}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="r-tel">WhatsApp de contacto</Label>
            <Input
              id="r-tel"
              inputMode="tel"
              value={telefono}
              maxLength={20}
              onChange={(e) => setTelefono(e.target.value)}
              aria-invalid={!!errors["telefono"]}
              aria-describedby="r-tel-err"
            />
            {errors["telefono"] && (
              <p id="r-tel-err" className="text-sm text-destructive">
                {errors["telefono"]}
              </p>
            )}
          </div>
          <div className="flex items-start gap-3">
            <Checkbox
              id="r-ok"
              checked={acepto}
              onCheckedChange={(v) => setAcepto(v === true)}
              className="mt-0.5"
            />
            <Label htmlFor="r-ok" className="font-normal leading-snug">
              Entiendo que las reservas no participan en el sorteo hasta que el organizador
              verifique el pago completo.
            </Label>
          </div>
          {errors["acepto"] && <p className="text-sm text-destructive">{errors["acepto"]}</p>}
          <PaymentBlock amountLabel={cop(total)} />
          <p className="text-sm text-muted-foreground">
            Realiza una sola transferencia por el total y luego pulsa el botón. Se abrirá WhatsApp
            para que adjuntes el comprobante.
          </p>
          {errors["form"] && (
            <p role="alert" className="text-sm text-destructive">
              {errors["form"]}
            </p>
          )}
          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy ? "Enviando reservas…" : "Registrar reservas y abrir WhatsApp"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function reserveToast(r: PostResult, n: number, exp: Date) {
  if (r.kind === "SUCCESS")
    toast.success(
      `Número ${pad(n)} reservado (pendiente de verificación). Tu reserva vence: ${bogota(exp)}.`,
      { duration: 10000 },
    );
  else if (r.kind === "UNCONFIRMED") toast.message(UNCONFIRMED, { duration: 12000 });
}

const emailSchema = z.string().trim().email("Escribe un correo válido.").max(254);

export function AlertDialog({ numero, onClose }: { numero: number | null; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (numero === null) return;
    const p = emailSchema.safeParse(email);
    if (!p.success) {
      setErr(p.error.issues[0]?.message ?? "Dato inválido.");
      return;
    }
    setErr("");
    if (!CONFIG.SCRIPT_SUPPORTS_EXTENDED) {
      window.location.href = mailLink(
        CONFIG.ORGANIZER_EMAIL,
        `Avisarme si se libera el número ${pad(numero)}`,
        `Por favor avísenme a ${p.data} si el número ${pad(numero)} vuelve a estar disponible.`,
      );
      onClose();
      return;
    }
    setBusy(true);
    const r = await postToScript({
      tipo: "ALERTA_DISPONIBILIDAD",
      numero,
      correo: p.data,
      fechaSolicitud: new Date().toISOString(),
      estado: "PENDIENTE",
    });
    setBusy(false);
    if (r.kind === "ERROR") {
      setErr("No pudimos registrar la alerta. Escríbenos por WhatsApp.");
      return;
    }
    toast.message(
      r.kind === "SUCCESS"
        ? `Te avisaremos a ${p.data} si el ${pad(numero)} se libera.`
        : "Solicitud de alerta enviada. Si tienes dudas, escríbenos por WhatsApp o correo.",
    );
    setEmail("");
    onClose();
  };
  return (
    <Dialog open={numero !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className={content}>
        <DialogHeader>
          <DialogTitle className="font-serif text-xl text-reserved">
            El número {numero !== null && pad(numero)} tiene una reserva pendiente
          </DialogTitle>
          <DialogDescription>
            No puede solicitarse mientras la reserva esté vigente. Si no se verifica el pago a
            tiempo, volverá a estar disponible.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3" noValidate>
          <Label htmlFor="a-mail">Tu correo electrónico</Label>
          <Input
            id="a-mail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={!!err}
          />
          {err && <p className="text-sm text-destructive">{err}</p>}
          {!CONFIG.SCRIPT_SUPPORTS_EXTENDED && (
            <p className="text-xs text-muted-foreground">
              Por ahora la alerta se gestiona manualmente: se abrirá tu correo con la solicitud
              lista.
            </p>
          )}
          <Button type="submit" className="w-full" disabled={busy}>
            Avisarme si se libera
          </Button>
          <Button asChild variant="outline" className="w-full">
            <a
              href={waLink(
                CONFIG.ORGANIZER_WHATSAPP,
                `Hola. Quisiera saber si el número ${numero !== null ? pad(numero) : ""} se libera.`,
              )}
              target="_blank"
              rel="noopener noreferrer"
            >
              Preguntar por WhatsApp
            </a>
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function PaidDialog({ numero, onClose }: { numero: number | null; onClose: () => void }) {
  return (
    <Dialog open={numero !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className={content}>
        <DialogHeader>
          <DialogTitle className="font-serif text-xl text-paid">
            Número {numero !== null && pad(numero)}: pago verificado
          </DialogTitle>
          <DialogDescription>
            Este número ya participa y no está disponible. Elige otro número libre.
          </DialogDescription>
        </DialogHeader>
        <Button onClick={onClose}>Entendido</Button>
      </DialogContent>
    </Dialog>
  );
}

const donationSchema = z.object({
  nombre: z.string().trim().max(60, "Máximo 60 caracteres.").optional(),
  valor: z.coerce
    .number({ invalid_type_error: "Escribe un valor." })
    .int()
    .min(1000, "El valor mínimo es $1.000.")
    .max(10_000_000, "Valor demasiado alto."),
});

export function DonationDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [nombre, setNombre] = useState("");
  const [contacto, setContacto] = useState("");
  const [valor, setValor] = useState("");
  const [err, setErr] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const p = donationSchema.safeParse({
      nombre: nombre || undefined,
      valor: valor.replace(/\D/g, ""),
    });
    if (!p.success) {
      setErr(p.error.issues[0]?.message ?? "Dato inválido.");
      return;
    }
    setErr("");
    let registration: PostResult = { kind: "UNCONFIRMED" };
    if (CONFIG.SCRIPT_SUPPORTS_EXTENDED) {
      registration = await postToScript({
        tipo: "APORTE_VOLUNTARIO",
        nombre: p.data.nombre ?? "Anónimo",
        contacto: contacto.slice(0, 80),
        valorDeclarado: p.data.valor,
        fecha: new Date().toISOString(),
        estado: "DECLARADO",
      });
      if (registration.kind === "ERROR") {
        setErr("El aporte no pudo registrarse automáticamente. Notifícalo por WhatsApp o correo.");
        return;
      }
    }
    window.open(
      waLink(
        CONFIG.ORGANIZER_WHATSAPP,
        `Hola. Hice un aporte voluntario de ${cop(p.data.valor)} (sin participar en la rifa). ${p.data.nombre ? `Nombre: ${p.data.nombre}. ` : ""}Adjunto el comprobante.`,
      ),
      "_blank",
      "noopener",
    );
    toast.message(
      registration.kind === "SUCCESS"
        ? "Aporte registrado; queda pendiente de verificación y no participa en el sorteo."
        : "Solicitud enviada; el aporte queda pendiente de verificación y no participa en el sorteo.",
    );
    onClose();
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className={content}>
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl text-gold">Aporte voluntario</DialogTitle>
          <DialogDescription>
            Puedes aportar cualquier valor de forma voluntaria. Este aporte no compra un número, no
            activa la rifa y no participa en el sorteo.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3" noValidate>
          <PaymentBlock />
          <div className="space-y-1.5">
            <Label htmlFor="d-val">Valor aportado (COP)</Label>
            <Input
              id="d-val"
              inputMode="numeric"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="d-name">Nombre o alias (opcional)</Label>
            <Input
              id="d-name"
              value={nombre}
              maxLength={60}
              onChange={(e) => setNombre(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="d-contact">Contacto (opcional)</Label>
            <Input
              id="d-contact"
              value={contacto}
              maxLength={80}
              onChange={(e) => setContacto(e.target.value)}
            />
          </div>
          {err && (
            <p role="alert" className="text-sm text-destructive">
              {err}
            </p>
          )}
          <Button type="submit" className="w-full">
            Notificar aporte por WhatsApp
          </Button>
          <a
            className="flex items-center justify-center gap-1 text-sm text-muted-foreground underline"
            href={mailLink(CONFIG.ORGANIZER_EMAIL, "Aporte voluntario")}
          >
            O notificar por correo <ExternalLink className="h-3 w-3" />
          </a>
        </form>
      </DialogContent>
    </Dialog>
  );
}
