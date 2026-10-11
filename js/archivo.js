// Formato del archivo de configuración (exportar / importar) y del guardado local.
// Las exclusiones se guardan por nombre para que el archivo sea legible;
// el sorteo solo guarda los enlaces cifrados, nunca las parejas en claro.

import { PLANTILLA_ORIGINAL } from './mensaje.js';
import { esToken } from './enlace.js';

const FORMATO = 'pal-invisible';
const VERSION = 1;
const MAX_PARTICIPANTES = 200;
const MAX_EXCLUSIONES = 2000;
const MAX_TEXTO = 100;
const MAX_MENSAJE = 3000;

export const nuevoId = () => Math.random().toString(36).slice(2, 10);

const participanteVacio = () => ({ id: nuevoId(), nombre: '', email: '' });

export function estadoVacio() {
  return {
    participantes: [participanteVacio(), participanteVacio(), participanteVacio()],
    exclusiones: [],
    mensaje: PLANTILLA_ORIGINAL,
    presupuesto: '',
    fecha: '',
    sorteo: null,
  };
}

export function aArchivo(estado) {
  const nombrePorId = new Map(estado.participantes.map((p) => [p.id, p.nombre.trim()]));
  return {
    formato: FORMATO,
    version: VERSION,
    participantes: estado.participantes.map(({ nombre, email }) => ({ nombre: nombre.trim(), email: email.trim() })),
    exclusiones: estado.exclusiones
      .map((e) => ({ de: nombrePorId.get(e.de), a: nombrePorId.get(e.a), ambos: e.ambos }))
      .filter((e) => e.de && e.a),
    mensaje: estado.mensaje,
    presupuesto: estado.presupuesto.trim(),
    fecha: estado.fecha,
    sorteo: estado.sorteo,
  };
}

function texto(valor, max = MAX_TEXTO) {
  if (valor === undefined || valor === null) return '';
  if (typeof valor !== 'string') throw new Error('el archivo tiene datos con un formato inesperado');
  return valor.slice(0, max);
}

function leerSorteo(sorteo) {
  if (!sorteo) return null;
  if (!Number.isInteger(sorteo.año) || !Array.isArray(sorteo.enlaces) || sorteo.enlaces.length > MAX_PARTICIPANTES) {
    throw new Error('el sorteo guardado no es válido');
  }
  return {
    año: sorteo.año,
    enlaces: sorteo.enlaces.map((e) => {
      if (!esToken(e?.token)) throw new Error('el sorteo guardado tiene un enlace dañado');
      return { pal: texto(e.pal), email: texto(e.email), token: e.token, enviado: e.enviado === true };
    }),
  };
}

export function desdeArchivo(datos) {
  if (datos?.formato !== FORMATO) throw new Error('no es un archivo de Pal Invisible');
  if (datos.version !== VERSION) throw new Error(`versión ${datos.version} no soportada`);
  if (!Array.isArray(datos.participantes) || datos.participantes.length > MAX_PARTICIPANTES) {
    throw new Error('la lista de participantes no es válida');
  }

  const participantes = datos.participantes.map((p) => ({ id: nuevoId(), nombre: texto(p?.nombre), email: texto(p?.email) }));
  const idPorNombre = new Map();
  for (const p of participantes) {
    if (p.nombre && !idPorNombre.has(p.nombre)) idPorNombre.set(p.nombre, p.id);
  }
  const exclusiones = (Array.isArray(datos.exclusiones) ? datos.exclusiones : [])
    .slice(0, MAX_EXCLUSIONES)
    .map((e) => ({ de: idPorNombre.get(e?.de), a: idPorNombre.get(e?.a), ambos: e?.ambos === true }))
    .filter((e) => e.de && e.a && e.de !== e.a);
  const mensaje = typeof datos.mensaje === 'string' && datos.mensaje.trim()
    ? datos.mensaje.slice(0, MAX_MENSAJE)
    : PLANTILLA_ORIGINAL;

  return {
    participantes: participantes.length ? participantes : [participanteVacio()],
    exclusiones,
    mensaje,
    presupuesto: texto(datos.presupuesto, 40),
    fecha: /^\d{4}-\d{2}-\d{2}$/.test(datos.fecha) ? datos.fecha : '',
    sorteo: leerSorteo(datos.sorteo),
  };
}
