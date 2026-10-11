// El texto de siempre del Pal Invisible, ahora como plantilla editable.
// Lo que va entre [corchetes] solo aparece si todos sus marcadores tienen valor.
export const PLANTILLA_ORIGINAL = `Querido {pal},

En el Pal Invisible de {año} te ha tocado regalar a alguien que lo tiene todo: {destinatario}.

El presupuesto son {presupuesto}[ y la fecha de entrega es: {fecha}].

Saludos y disfruta del horario laboral,

Gasto`;

const NOMBRES = 'pal|destinatario|año|presupuesto|fecha';
const MARCADOR = new RegExp(`(\\{(?:${NOMBRES})\\})`);
const MARCADORES = new RegExp(`\\{(${NOMBRES})\\}`, 'g');
const OPCIONAL = /\[([^[\]]*)\]/g;

const tieneValor = (valores, nombre) => String(valores[nombre] ?? '').trim() !== '';

/** Marcadores que se usan fuera de [corchetes], es decir, obligatorios. */
export function marcadoresObligatorios(plantilla) {
  const fuera = plantilla.replace(OPCIONAL, (todo, dentro) => (dentro.match(MARCADORES) ? '' : todo));
  return [...new Set([...fuera.matchAll(MARCADORES)].map((m) => m[1]))];
}

function resolverOpcionales(linea, valores) {
  return linea.replace(OPCIONAL, (todo, dentro) => {
    const usados = [...dentro.matchAll(MARCADORES)].map((m) => m[1]);
    if (!usados.length) return todo; // corchetes sin marcadores: texto normal
    return usados.every((n) => tieneValor(valores, n)) ? dentro : '';
  });
}

/** "2026-12-20" → "domingo, 20 de diciembre" */
export function formatearFecha(iso) {
  if (!iso) return '';
  const [año, mes, dia] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
    .format(new Date(año, mes - 1, dia));
}

/**
 * Convierte la plantilla en párrafos de trozos de texto plano (sin HTML).
 * El destinatario se marca como destacado para mostrarlo en grande.
 * @returns {Array<Array<{ texto: string, destacado: boolean }>>}
 */
export function parrafosMensaje(plantilla, { pal, destinatario, año, presupuesto = '', fecha = '' }) {
  const valores = { pal, destinatario, año: String(año), presupuesto, fecha };
  return plantilla
    .split(/\r?\n/)
    .map((linea) => resolverOpcionales(linea, valores).trim())
    .filter(Boolean)
    .map((linea) => linea
      .split(MARCADOR)
      .filter(Boolean)
      .map((trozo) => {
        const nombre = trozo.match(/^\{(.+)\}$/)?.[1];
        if (nombre === 'destinatario') return { texto: destinatario, destacado: true };
        return { texto: nombre && Object.hasOwn(valores, nombre) ? valores[nombre] : trozo, destacado: false };
      }));
}
