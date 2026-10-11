import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cifrar, descifrar, esToken } from '../js/enlace.js';

const datos = { pal: 'Ana', destinatario: 'Luis Ñúñez 🎄', año: 2026, presupuesto: '30€', fecha: 'domingo, 20 de diciembre', mensaje: 'Querido {pal},\n<b>no es HTML</b>' };

test('ida y vuelta conserva los datos (incluidos acentos y emojis)', async () => {
  const token = await cifrar(datos);
  assert.ok(esToken(token));
  assert.deepEqual(await descifrar(token), datos);
});

test('el nombre del destinatario no aparece en el enlace', async () => {
  const token = await cifrar(datos);
  assert.ok(!token.includes('Luis'));
  assert.ok(!atob(token.replaceAll('-', '+').replaceAll('_', '/').padEnd(Math.ceil(token.length / 4) * 4, '=')).includes('Luis'));
});

test('cada enlace es distinto aunque los datos sean iguales', async () => {
  assert.notEqual(await cifrar(datos), await cifrar(datos));
});

test('un enlace manipulado o cortado se rechaza', async () => {
  const token = await cifrar(datos);
  const cambiado = token.slice(0, -2) + (token.at(-2) === 'A' ? 'B' : 'A') + token.at(-1);
  await assert.rejects(descifrar(cambiado), /no válido/);
  await assert.rejects(descifrar(token.slice(0, 40)), /no válido/);
  await assert.rejects(descifrar('basura'), /no válido/);
});

test('los enlaces sin presupuesto ni fecha siguen funcionando', async () => {
  const { presupuesto, fecha, ...antiguo } = datos;
  assert.deepEqual(await descifrar(await cifrar(antiguo)), { ...antiguo, presupuesto: '', fecha: '' });
});
