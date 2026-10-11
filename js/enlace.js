// Cada participante recibe un enlace con su asignación cifrada en el fragmento (#...),
// la parte de la URL que el navegador nunca envía a ningún servidor.
// La clave viaja en el propio enlace: el cifrado evita que se lea a simple vista,
// pero quien tenga el enlace puede abrirlo.

const VERSION = 1;
const LONG_CLAVE = 16;
const LONG_IV = 12;
const CABECERA = 1 + LONG_CLAVE + LONG_IV;

function aBase64Url(bytes) {
  let binario = '';
  for (const b of bytes) binario += String.fromCharCode(b);
  return btoa(binario).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function deBase64Url(texto) {
  const b64 = texto.replaceAll('-', '+').replaceAll('_', '/');
  const binario = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(binario, (c) => c.charCodeAt(0));
}

/** @param {{ pal: string, destinatario: string, año: number, mensaje: string, presupuesto?: string, fecha?: string }} datos */
export async function cifrar(datos) {
  const clave = crypto.getRandomValues(new Uint8Array(LONG_CLAVE));
  const iv = crypto.getRandomValues(new Uint8Array(LONG_IV));
  const llave = await crypto.subtle.importKey('raw', clave, 'AES-GCM', false, ['encrypt']);
  const plano = new TextEncoder().encode(JSON.stringify(datos));
  const cifrado = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, llave, plano));
  return aBase64Url(Uint8Array.of(VERSION, ...clave, ...iv, ...cifrado));
}

export async function descifrar(token) {
  try {
    const bytes = deBase64Url(token);
    if (bytes[0] !== VERSION || bytes.length <= CABECERA) throw new Error();
    const llave = await crypto.subtle.importKey('raw', bytes.slice(1, 1 + LONG_CLAVE), 'AES-GCM', false, ['decrypt']);
    const plano = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: bytes.slice(1 + LONG_CLAVE, CABECERA) },
      llave,
      bytes.slice(CABECERA),
    );
    const datos = JSON.parse(new TextDecoder().decode(plano));
    if (typeof datos.pal !== 'string' || typeof datos.destinatario !== 'string'
      || typeof datos.mensaje !== 'string' || !Number.isInteger(datos.año)) throw new Error();
    for (const opcional of ['presupuesto', 'fecha']) {
      if (datos[opcional] === undefined) datos[opcional] = '';
      else if (typeof datos[opcional] !== 'string') throw new Error();
    }
    return datos;
  } catch {
    throw new Error('Enlace no válido o incompleto');
  }
}

export const esToken = (texto) => /^[A-Za-z0-9_-]{40,8000}$/.test(texto);
