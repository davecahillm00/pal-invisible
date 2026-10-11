import { test } from 'node:test';
import assert from 'node:assert/strict';
import { siguientePorCorreo } from '../js/correo.js';

test('el siguiente es el primero sin enviar que tiene correo', () => {
  const enlaces = [
    { pal: 'Ana', email: 'ana@example.com', enviado: true },
    { pal: 'Luis', email: '', enviado: false },
    { pal: 'Marta', email: 'marta@example.com', enviado: false },
    { pal: 'Pepe', email: 'pepe@example.com', enviado: false },
  ];
  assert.equal(siguientePorCorreo(enlaces)?.pal, 'Marta');
});

test('se salta los correos no válidos', () => {
  const enlaces = [
    { pal: 'Ana', email: 'ana', enviado: false },
    { pal: 'Luis', email: 'luis@example.com', enviado: false },
  ];
  assert.equal(siguientePorCorreo(enlaces)?.pal, 'Luis');
});

test('no hay siguiente si todos están enviados o no tienen correo', () => {
  assert.equal(siguientePorCorreo([
    { pal: 'Ana', email: 'ana@example.com', enviado: true },
    { pal: 'Luis', email: '', enviado: false },
  ]), undefined);
  assert.equal(siguientePorCorreo([]), undefined);
});
