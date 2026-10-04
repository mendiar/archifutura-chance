/**
 * PROPUESTA de Apps Script compatible con el frontend "El Destino y la Voluntad".
 * NO reemplaza automáticamente tu script actual: revísalo y pégalo tú mismo.
 *
 * Conserva la lógica original:
 *  - GET devuelve [{ numero, estado }] (solo columnas públicas).
 *  - POST de reserva: { numero, nombre, telefono } → { status: "SUCCESS" | "TAKEN" | "ERROR" }.
 *  - Estados de la hoja: LIBRE, PENDIENTE (reserva) y, solo manualmente, PAGADO_VERIFICADO.
 *  - LockService para evitar reservas simultáneas del mismo número.
 *
 * Cambios necesarios respecto al original:
 *  1. doGet/doPost estaban DENTRO de myFunction(): Apps Script no los encuentra así.
 *     Aquí están en el nivel superior.
 *  2. Validación de tipo y rango del número (0–99) y de longitudes.
 *  3. Columnas nuevas (sin borrar datos): VALOR, FECHA_RESERVA, FECHA_VENCIMIENTO,
 *     FECHA_PAGO_VERIFICADO, CORREO, OBSERVACIONES. Se crean si faltan.
 *  4. Vencimiento de reservas a las 3 h (o al cierre) → vuelve a LIBRE y avisa ALERTAS.
 *  5. Cierre definitivo: 13/10/2026 11:59 p. m. America/Bogota → rechaza reservas.
 *  6. Pestañas ALERTAS, APORTES y SERVICIOS para los tipos
 *     ALERTA_DISPONIBILIDAD, APORTE_VOLUNTARIO y CONSULTA_SERVICIO.
 *  7. El script nunca escribe PAGADO_VERIFICADO: eso lo hace el organizador a mano en la hoja.
 *
 * Despliegue: Implementar → Nueva implementación → Aplicación web →
 *   Ejecutar como: Yo · Quién tiene acceso: Cualquier usuario (Anyone).
 * Después, en el frontend: VITE_SCRIPT_SUPPORTS_EXTENDED=true.
 * Opcional: activador por tiempo cada 15 min de liberarVencidas().
 */

var MAIN_SHEET = "Hoja 1"; // ← cambia al nombre real de tu pestaña principal
var CUTOFF = new Date("2026-10-13T23:59:00-05:00");
var RESERVA_MS = 3 * 60 * 60 * 1000;
var PRECIO = 20000;
var NOTIFY_EMAIL = "mendiar88@gmail.com";

var MAIN_HEADERS = ["NUMERO", "ESTADO", "NOMBRE", "TELEFONO", "VALOR", "FECHA_RESERVA",
  "FECHA_VENCIMIENTO", "FECHA_PAGO_VERIFICADO", "CORREO", "OBSERVACIONES"];

function json(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function mainSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(MAIN_SHEET) || ss.getSheets()[0];
}

function ensureHeaders(sheet, headers) {
  var lastCol = Math.max(sheet.getLastColumn(), 1);
  var current = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
  headers.forEach(function (h) {
    if (current.indexOf(h) === -1) {
      current.push(h);
      sheet.getRange(1, current.length).setValue(h);
    }
  });
  var idx = {};
  current.forEach(function (h, i) { idx[h] = i + 1; });
  return idx;
}

function tab(name, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  ensureHeaders(sh, headers);
  return sh;
}

function str(v, max) { return String(v == null ? "" : v).trim().slice(0, max); }

function rowForNumber(sheet, number, numberColumn) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  var values = sheet.getRange(2, numberColumn, lastRow - 1, 1).getValues();
  for (var i = 0; i < values.length; i++) {
    if (Number(values[i][0]) === number) return i + 2;
  }
  return -1;
}

function liberarVencidas() {
  var sheet = mainSheet();
  var c = ensureHeaders(sheet, MAIN_HEADERS);
  var n = sheet.getLastRow() - 1;
  if (n < 1) return;
  var rows = sheet.getRange(2, 1, n, sheet.getLastColumn()).getValues();
  var now = new Date();
  rows.forEach(function (r, i) {
    var estado = String(r[c.ESTADO - 1]).toUpperCase();
    var venc = r[c.FECHA_VENCIMIENTO - 1];
    if (estado === "PENDIENTE" && venc && new Date(venc) <= now) {
      var row = i + 2;
      sheet.getRange(row, c.ESTADO).setValue("LIBRE");
      sheet.getRange(row, c.OBSERVACIONES).setValue("Reserva vencida " + now.toISOString());
      [c.NOMBRE, c.TELEFONO, c.FECHA_RESERVA, c.FECHA_VENCIMIENTO].forEach(function (col) {
        sheet.getRange(row, col).clearContent();
      });
      avisarAlertas(Number(r[c.NUMERO - 1]));
    }
  });
}

function avisarAlertas(numero) {
  var sh = tab("ALERTAS", ["NUMERO", "CORREO", "FECHA_SOLICITUD", "ESTADO", "FECHA_AVISO"]);
  var n = sh.getLastRow() - 1;
  if (n < 1) return;
  var rows = sh.getRange(2, 1, n, 5).getValues();
  rows.forEach(function (r, i) {
    if (Number(r[0]) === numero && r[3] === "PENDIENTE") {
      var nn = ("0" + numero).slice(-2);
      MailApp.sendEmail(r[1], "El número " + nn + " está disponible",
        "El número " + nn + " de 'El Destino y la Voluntad' volvió a estar disponible. " +
        "Puede volver a reservarse en la web; quien llegue primero lo obtiene.");
      sh.getRange(i + 2, 4).setValue("AVISADO");
      sh.getRange(i + 2, 5).setValue(new Date());
    }
  });
}

function doGet(e) {
  liberarVencidas();
  var sheet = mainSheet();
  var lastRow = Math.max(sheet.getLastRow(), 1);
  var data = lastRow >= 2 ? sheet.getRange(2, 1, lastRow - 1, 2).getValues() : [];
  return json(data.map(function (row) { return { numero: row[0], estado: row[1] }; }));
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var c = JSON.parse(e.postData.contents);
    var tipo = str(c.tipo || "RESERVA", 30);
    if (tipo === "RESERVA") return reservar(c);
    if (tipo === "ALERTA_DISPONIBILIDAD") return alerta(c);
    if (tipo === "APORTE_VOLUNTARIO") return aporte(c);
    if (tipo === "CONSULTA_SERVICIO") return servicio(c);
    return json({ status: "ERROR", message: "Tipo no soportado" });
  } catch (error) {
    return json({ status: "ERROR", message: error.toString() });
  } finally {
    lock.releaseLock();
  }
}

function reservar(c) {
  if (new Date() >= CUTOFF) return json({ status: "ERROR", message: "Cierre definitivo alcanzado" });
  var numero = Number(c.numero);
  if (!Number.isInteger(numero) || numero < 0 || numero > 99) return json({ status: "ERROR", message: "Número inválido" });
  var nombre = str(c.nombre, 60), telefono = str(c.telefono, 20).replace(/[^\d+]/g, "");
  if (nombre.length < 2 || !/^\+?\d{10,13}$/.test(telefono)) return json({ status: "ERROR", message: "Datos inválidos" });

  liberarVencidas();
  var sheet = mainSheet();
  var col = ensureHeaders(sheet, MAIN_HEADERS);
  var rowIndex = rowForNumber(sheet, numero, col.NUMERO);
  if (rowIndex < 0) return json({ status: "ERROR", message: "Número no configurado" });
  var estadoActual = String(sheet.getRange(rowIndex, col.ESTADO).getValue()).toUpperCase();
  if (estadoActual !== "LIBRE" && estadoActual !== "LIBERADO" && estadoActual !== "") return json({ status: "TAKEN" });

  var now = new Date();
  var venc = new Date(Math.min(now.getTime() + RESERVA_MS, CUTOFF.getTime()));
  sheet.getRange(rowIndex, col.ESTADO).setValue("PENDIENTE");
  sheet.getRange(rowIndex, col.NOMBRE).setValue(nombre);
  sheet.getRange(rowIndex, col.TELEFONO).setValue("'" + telefono);
  sheet.getRange(rowIndex, col.VALOR).setValue(PRECIO);
  sheet.getRange(rowIndex, col.FECHA_RESERVA).setValue(now);
  sheet.getRange(rowIndex, col.FECHA_VENCIMIENTO).setValue(venc);
  sheet.getRange(rowIndex, col.OBSERVACIONES).clearContent();
  try {
    MailApp.sendEmail(NOTIFY_EMAIL, "Nueva reserva: " + ("0" + numero).slice(-2),
      "Reserva pendiente de verificar. Vence: " + venc + ". Revisa la hoja.");
  } catch (err) {}
  return json({ status: "SUCCESS", vence: venc.toISOString() });
}

function alerta(c) {
  var numero = Number(c.numero), correo = str(c.correo, 254);
  if (!Number.isInteger(numero) || numero < 0 || numero > 99 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo))
    return json({ status: "ERROR", message: "Datos inválidos" });
  var sh = tab("ALERTAS", ["NUMERO", "CORREO", "FECHA_SOLICITUD", "ESTADO", "FECHA_AVISO"]);
  var rows = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 4).getValues() : [];
  var dup = rows.some(function (r) { return Number(r[0]) === numero && r[1] === correo && r[3] === "PENDIENTE"; });
  if (!dup) sh.appendRow([numero, correo, new Date(), "PENDIENTE", ""]);
  return json({ status: "SUCCESS" });
}

function aporte(c) {
  var valor = Number(c.valorDeclarado);
  if (!Number.isInteger(valor) || valor < 1000 || valor > 10000000) return json({ status: "ERROR", message: "Valor inválido" });
  tab("APORTES", ["FECHA", "NOMBRE", "CONTACTO", "VALOR_DECLARADO", "ESTADO", "OBSERVACIONES"])
    .appendRow([new Date(), str(c.nombre, 60) || "Anónimo", str(c.contacto, 80), valor, "DECLARADO", ""]);
  return json({ status: "SUCCESS" });
}

function servicio(c) {
  tab("SERVICIOS", ["FECHA", "NOMBRE", "CONTACTO", "SERVICIO", "ALCANCE", "PRECIO", "ESTADO"])
    .appendRow([new Date(), str(c.nombre, 60), str(c.contacto, 80), str(c.servicio, 80), str(c.alcance, 500), "", "CONSULTA"]);
  return json({ status: "SUCCESS" });
}
