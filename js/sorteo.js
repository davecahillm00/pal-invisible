// Sorteo de amigo invisible con restricciones: nadie se regala a sí mismo
// ni a quien tenga prohibido (exclusiones o sorteo del año anterior).

const clave = (de, a) => `${de}\u0000${a}`;

function azarSeguro() {
  return crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;
}

function barajar(lista, aleatorio) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(aleatorio() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

function destinosPosibles(nombres, prohibidos) {
  const vetados = new Set(prohibidos.map(([de, a]) => clave(de, a)));
  return new Map(nombres.map((de) => [de, nombres.filter((a) => a !== de && !vetados.has(clave(de, a)))]));
}

/**
 * Detecta los casos imposibles evidentes, para poder explicar por qué falla un sorteo.
 * @returns {{ sinDestinatario: string[], sinRegalo: string[] }}
 */
export function sinOpciones(nombres, prohibidos = []) {
  const posibles = destinosPosibles(nombres, prohibidos);
  const receptores = new Set([...posibles.values()].flat());
  return {
    sinDestinatario: nombres.filter((n) => posibles.get(n).length === 0),
    sinRegalo: nombres.filter((n) => !receptores.has(n)),
  };
}

/**
 * @param {string[]} nombres Participantes (sin repetir).
 * @param {Array<[string, string]>} prohibidos Pares [de, a] que no pueden darse.
 * @returns {Map<string, string> | null} quién regala a quién, o null si no hay combinación posible.
 */
export function sortear(nombres, prohibidos = [], { aleatorio = azarSeguro, intentosAlAzar = 1000, maxPasos = 200_000 } = {}) {
  if (new Set(nombres).size !== nombres.length) throw new Error('Hay nombres repetidos');
  if (nombres.length < 2) return null;
  const posibles = destinosPosibles(nombres, prohibidos);

  // 1) Permutaciones al azar: todas las combinaciones válidas son igual de probables.
  for (let i = 0; i < intentosAlAzar; i++) {
    const destinos = barajar(nombres, aleatorio);
    if (nombres.every((de, k) => posibles.get(de).includes(destinos[k]))) {
      return new Map(nombres.map((de, k) => [de, destinos[k]]));
    }
  }

  // 2) Con muchas restricciones, búsqueda con vuelta atrás: si existe solución, la encuentra.
  const orden = barajar(nombres, aleatorio).sort((x, y) => posibles.get(x).length - posibles.get(y).length);
  const asignacion = new Map();
  const usados = new Set();
  let pasos = 0;
  const buscar = (i) => {
    if (i === orden.length) return true;
    if (++pasos > maxPasos) return false;
    const de = orden[i];
    for (const a of barajar(posibles.get(de), aleatorio)) {
      if (usados.has(a)) continue;
      asignacion.set(de, a);
      usados.add(a);
      if (buscar(i + 1)) return true;
      asignacion.delete(de);
      usados.delete(a);
    }
    return false;
  };
  return buscar(0) ? asignacion : null;
}
