import { descifrar } from './enlace.js';
import { parrafosMensaje } from './mensaje.js';

const $ = (selector) => document.querySelector(selector);

function pintarMensaje(contenedor, datos) {
  // Solo texto plano: nada del enlace se interpreta como HTML.
  const parrafos = parrafosMensaje(datos.mensaje, datos).map((trozos) => {
    const p = document.createElement('p');
    for (const { texto, destacado } of trozos) {
      if (destacado) {
        const fuerte = document.createElement('strong');
        fuerte.className = 'destinatario';
        fuerte.textContent = texto;
        p.append(fuerte);
      } else {
        p.append(texto);
      }
    }
    return p;
  });
  contenedor.replaceChildren(...parrafos);
}

export async function iniciarRevelado(token) {
  $('#revelar').hidden = false;

  let datos;
  try {
    datos = await descifrar(token);
  } catch {
    $('#rev-error').hidden = false;
    return;
  }

  $('#rev-anio').textContent = datos.año;
  $('#rev-pal').textContent = datos.pal;
  $('#rev-pal-2').textContent = datos.pal;
  $('#rev-cerrado').hidden = false;

  $('#btn-descubrir').addEventListener('click', () => {
    const abierto = $('#rev-abierto');
    pintarMensaje(abierto, datos);
    $('#rev-cerrado').hidden = true;
    abierto.hidden = false;
    abierto.classList.add('aparece');
  });
}
