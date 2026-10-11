import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sortear, sinOpciones } from '../js/sorteo.js';

function comprobarValida(nombres, prohibidos, asignacion) {
  assert.ok(asignacion, 'debería encontrar solución');
  assert.deepEqual([...asignacion.keys()].sort(), [...nombres].sort());
  assert.deepEqual([...asignacion.values()].sort(), [...nombres].sort(), 'cada uno recibe exactamente un regalo');
  const vetados = new Set(prohibidos.map(([de, a]) => `${de}>${a}`));
  for (const [de, a] of asignacion) {
    assert.notEqual(de, a, `${de} se regala a sí mismo`);
    assert.ok(!vetados.has(`${de}>${a}`), `${de} no puede regalar a ${a}`);
  }
}

test('sin restricciones, nadie se regala a sí mismo', () => {
  const nombres = ['Ana', 'Luis', 'Marta', 'Pepe', 'Sara'];
  for (let i = 0; i < 200; i++) comprobarValida(nombres, [], sortear(nombres));
});

test('respeta exclusiones en ambos sentidos', () => {
  const nombres = ['Ana', 'Luis', 'Marta', 'Pepe', 'Sara', 'Toni'];
  const prohibidos = [['Ana', 'Luis'], ['Luis', 'Ana'], ['Marta', 'Pepe'], ['Pepe', 'Marta'], ['Sara', 'Toni']];
  for (let i = 0; i < 200; i++) comprobarValida(nombres, prohibidos, sortear(nombres, prohibidos));
});

test('la búsqueda exhaustiva encuentra la única solución posible', () => {
  // Solo es válido el ciclo A→B→C→D→A.
  const nombres = ['A', 'B', 'C', 'D'];
  const permitidos = new Set(['A>B', 'B>C', 'C>D', 'D>A']);
  const prohibidos = nombres.flatMap((de) => nombres.filter((a) => a !== de && !permitidos.has(`${de}>${a}`)).map((a) => [de, a]));
  for (let i = 0; i < 50; i++) {
    const asignacion = sortear(nombres, prohibidos, { intentosAlAzar: 0 });
    comprobarValida(nombres, prohibidos, asignacion);
  }
});

test('devuelve null si no hay combinación posible', () => {
  const nombres = ['Ana', 'Luis', 'Marta'];
  const prohibidos = [['Ana', 'Luis'], ['Ana', 'Marta']];
  assert.equal(sortear(nombres, prohibidos), null);
  assert.deepEqual(sinOpciones(nombres, prohibidos), { sinDestinatario: ['Ana'], sinRegalo: [] });
});

test('detecta a quien nadie puede regalar', () => {
  const nombres = ['Ana', 'Luis', 'Marta'];
  assert.deepEqual(sinOpciones(nombres, [['Luis', 'Ana'], ['Marta', 'Ana']]).sinRegalo, ['Ana']);
});

test('caso imposible sin imposibles evidentes', () => {
  // Todos pueden regalar a alguien y todos pueden recibir, pero A y B solo pueden regalar a C.
  const nombres = ['A', 'B', 'C'];
  const prohibidos = [['A', 'B'], ['B', 'A']];
  assert.deepEqual(sinOpciones(nombres, prohibidos), { sinDestinatario: [], sinRegalo: [] });
  assert.equal(sortear(nombres, prohibidos), null);
});

test('avisa si la búsqueda se agota antes de decidir', () => {
  // Hay solución (el ciclo A→B→C→D→A), pero con un solo paso no da tiempo a encontrarla:
  // no se puede decir que sea imposible.
  const nombres = ['A', 'B', 'C', 'D'];
  const permitidos = new Set(['A>B', 'B>C', 'C>D', 'D>A']);
  const prohibidos = nombres.flatMap((de) => nombres.filter((a) => a !== de && !permitidos.has(`${de}>${a}`)).map((a) => [de, a]));
  assert.throws(() => sortear(nombres, prohibidos, { intentosAlAzar: 0, maxPasos: 1 }), { name: 'BusquedaAgotada' });
});

test('rechaza nombres repetidos', () => {
  assert.throws(() => sortear(['Ana', 'Ana', 'Luis']), /repetidos/);
});

test('salen todas las combinaciones posibles', () => {
  // Con 3 personas solo hay dos: A→B→C→A y A→C→B→A.
  const vistas = new Set();
  for (let i = 0; i < 200; i++) vistas.add(sortear(['A', 'B', 'C']).get('A'));
  assert.deepEqual([...vistas].sort(), ['B', 'C']);
});
