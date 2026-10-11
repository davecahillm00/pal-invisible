import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aArchivo, desdeArchivo, estadoVacio } from '../js/archivo.js';
import { parrafosMensaje, PLANTILLA_ORIGINAL, formatearFecha, marcadoresObligatorios } from '../js/mensaje.js';
import { cifrar } from '../js/enlace.js';

test('exportar e importar conserva participantes, exclusiones y sorteo', async () => {
  const estado = {
    participantes: [
      { id: 'a', nombre: 'Ana ', email: 'ana@example.com' },
      { id: 'b', nombre: 'Luis', email: '' },
      { id: 'c', nombre: 'Marta', email: '' },
    ],
    exclusiones: [{ de: 'a', a: 'b', ambos: true }, { de: 'c', a: 'a', ambos: false }],
    mensaje: 'Hola {pal}: {destinatario}',
    presupuesto: '50€',
    fecha: '2026-12-20',
    sorteo: { año: 2025, enlaces: [{ pal: 'Ana', email: '', token: await cifrar({ pal: 'Ana', destinatario: 'Marta', año: 2025, mensaje: 'x' }), enviado: true }] },
  };
  const archivo = JSON.parse(JSON.stringify(aArchivo(estado)));
  assert.deepEqual(archivo.exclusiones, [{ de: 'Ana', a: 'Luis', ambos: true }, { de: 'Marta', a: 'Ana', ambos: false }]);

  const vuelta = desdeArchivo(archivo);
  assert.deepEqual(vuelta.participantes.map((p) => p.nombre), ['Ana', 'Luis', 'Marta']);
  const nombre = (id) => vuelta.participantes.find((p) => p.id === id).nombre;
  assert.deepEqual(vuelta.exclusiones.map((e) => [nombre(e.de), nombre(e.a), e.ambos]), [['Ana', 'Luis', true], ['Marta', 'Ana', false]]);
  assert.equal(vuelta.mensaje, estado.mensaje);
  assert.equal(vuelta.presupuesto, '50€');
  assert.equal(vuelta.fecha, '2026-12-20');
  assert.deepEqual(vuelta.sorteo, estado.sorteo);
});

test('el archivo no guarda las parejas del sorteo en claro', async () => {
  const estado = estadoVacio();
  estado.sorteo = { año: 2026, enlaces: [{ pal: 'Ana', email: '', token: await cifrar({ pal: 'Ana', destinatario: 'Zacarías', año: 2026, mensaje: 'x' }), enviado: false }] };
  assert.ok(!JSON.stringify(aArchivo(estado)).includes('Zacarías'));
});

test('rechaza archivos ajenos o dañados', () => {
  assert.throws(() => desdeArchivo({}), /no es un archivo/);
  assert.throws(() => desdeArchivo({ formato: 'pal-invisible', version: 99, participantes: [] }), /versión/);
  assert.throws(() => desdeArchivo({ formato: 'pal-invisible', version: 1, participantes: [{ nombre: 42 }] }), /formato inesperado/);
  assert.throws(() => desdeArchivo({ formato: 'pal-invisible', version: 1, participantes: [], sorteo: { año: 2026, enlaces: [{ token: '<script>' }] } }), /dañado/);
});

test('ignora exclusiones de personas que no están', () => {
  const estado = desdeArchivo({ formato: 'pal-invisible', version: 1, participantes: [{ nombre: 'Ana' }], exclusiones: [{ de: 'Ana', a: 'Nadie' }] });
  assert.deepEqual(estado.exclusiones, []);
});

const textoDe = (parrafo) => parrafo.map((t) => t.texto).join('');

test('el mensaje original se convierte en párrafos con el destinatario destacado', () => {
  const parrafos = parrafosMensaje(PLANTILLA_ORIGINAL, { pal: 'Ana', destinatario: 'Luis', año: 2026, presupuesto: '100€' });
  assert.equal(parrafos.length, 5);
  assert.deepEqual(parrafos[0], [{ texto: 'Querido ', destacado: false }, { texto: 'Ana', destacado: false }, { texto: ',', destacado: false }]);
  assert.ok(parrafos[1].some((t) => t.destacado && t.texto === 'Luis'));
  assert.ok(parrafos[1].some((t) => t.texto === '2026'));
  assert.deepEqual(parrafos.at(-1), [{ texto: 'Gasto', destacado: false }]);
});

test('un nombre con marcadores o HTML se trata como texto', () => {
  const parrafos = parrafosMensaje('{pal} → {destinatario}', { pal: '{destinatario}', destinatario: '<img src=x>', año: 2026 });
  assert.deepEqual(parrafos, [[
    { texto: '{destinatario}', destacado: false },
    { texto: ' → ', destacado: false },
    { texto: '<img src=x>', destacado: true },
  ]]);
});

test('la fecha solo aparece si se ha puesto', () => {
  const datos = { pal: 'Ana', destinatario: 'Luis', año: 2026, presupuesto: '100€' };
  assert.equal(textoDe(parrafosMensaje(PLANTILLA_ORIGINAL, datos)[2]), 'El presupuesto son 100€.');
  assert.equal(
    textoDe(parrafosMensaje(PLANTILLA_ORIGINAL, { ...datos, fecha: 'domingo, 20 de diciembre' })[2]),
    'El presupuesto son 100€ y la fecha de entrega es: domingo, 20 de diciembre.',
  );
});

test('una línea entera opcional desaparece si no tiene datos', () => {
  const plantilla = 'Hola {pal}\n[Entrega: {fecha}]\nFin';
  assert.deepEqual(parrafosMensaje(plantilla, { pal: 'Ana', destinatario: 'Luis', año: 2026 }).map(textoDe), ['Hola Ana', 'Fin']);
});

test('los corchetes sin marcadores se dejan como texto', () => {
  assert.equal(textoDe(parrafosMensaje('Ojo [importante] {pal}', { pal: 'Ana', destinatario: 'L', año: 2026 })[0]), 'Ojo [importante] Ana');
});

test('detecta qué marcadores son obligatorios', () => {
  assert.deepEqual(marcadoresObligatorios(PLANTILLA_ORIGINAL).sort(), ['año', 'destinatario', 'pal', 'presupuesto']);
  assert.ok(marcadoresObligatorios('Entrega: {fecha}').includes('fecha'));
});

test('formatea la fecha en español', () => {
  assert.equal(formatearFecha('2026-12-20'), 'domingo, 20 de diciembre');
  assert.equal(formatearFecha(''), '');
});
