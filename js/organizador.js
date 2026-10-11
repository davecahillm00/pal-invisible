import { sortear, sinOpciones } from './sorteo.js';
import { cifrar, descifrar } from './enlace.js';
import { PLANTILLA_ORIGINAL, formatearFecha, marcadoresObligatorios } from './mensaje.js';
import { aArchivo, desdeArchivo, estadoVacio, nuevoId } from './archivo.js';

const CLAVE_LOCAL = 'pal-invisible';
const MIN_PARTICIPANTES = 3;
const EMAIL_VALIDO = /^[^\s@<>()",;:?&#%]+@[^\s@<>()",;:?&#%]+\.[^\s@<>()",;:?&#%]+$/;

const $ = (selector) => document.querySelector(selector);

let estado;
let evitarAnterior = false;

// ---------- utilidades ----------

function el(etiqueta, clase, texto) {
  const nodo = document.createElement(etiqueta);
  if (clase) nodo.className = clase;
  if (texto !== undefined) nodo.textContent = texto;
  return nodo;
}

function boton(texto, alPulsar, clase) {
  const b = el('button', clase, texto);
  b.type = 'button';
  b.addEventListener('click', alPulsar);
  return b;
}

let temporizadorAviso;
function aviso(texto) {
  const nodo = $('#aviso');
  nodo.textContent = texto;
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => { nodo.textContent = ''; }, 4000);
}

function errorSorteo(texto = '') {
  $('#error-sorteo').textContent = texto;
}

const añoActual = () => new Date().getFullYear();
const urlBase = () => location.origin + location.pathname;
const enlaceDe = (token) => `${urlBase()}#${token}`;
const nombreDe = (id) => estado.participantes.find((p) => p.id === id)?.nombre.trim() ?? '';

function cargarLocal() {
  try {
    const crudo = localStorage.getItem(CLAVE_LOCAL);
    if (crudo) return desdeArchivo(JSON.parse(crudo));
  } catch { /* sin almacenamiento o datos dañados: empezamos de cero */ }
  return estadoVacio();
}

function guardarLocal() {
  try {
    localStorage.setItem(CLAVE_LOCAL, JSON.stringify(aArchivo(estado)));
  } catch { /* navegación privada o almacenamiento bloqueado */ }
}

function descargar(nombreArchivo, datos) {
  const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = el('a');
  a.href = url;
  a.download = nombreArchivo;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---------- participantes ----------

function filaParticipante(p, i) {
  const li = el('li', 'fila-participante');

  const nombre = el('input');
  nombre.type = 'text';
  nombre.placeholder = 'Nombre';
  nombre.maxLength = 60;
  nombre.value = p.nombre;
  nombre.setAttribute('aria-label', `Nombre del participante ${i + 1}`);
  nombre.addEventListener('input', () => {
    p.nombre = nombre.value;
    renderExclusiones();
    guardarLocal();
  });

  const email = el('input');
  email.type = 'email';
  email.placeholder = 'Correo (opcional)';
  email.maxLength = 100;
  email.autocomplete = 'off';
  email.value = p.email;
  email.setAttribute('aria-label', `Correo del participante ${i + 1}`);
  email.addEventListener('input', () => {
    p.email = email.value;
    guardarLocal();
  });

  const quitar = boton('✕', () => {
    estado.participantes = estado.participantes.filter((x) => x !== p);
    estado.exclusiones = estado.exclusiones.filter((e) => e.de !== p.id && e.a !== p.id);
    cambio();
  }, 'icono');
  quitar.setAttribute('aria-label', `Quitar participante ${i + 1}`);

  li.append(nombre, email, quitar);
  return li;
}

function renderParticipantes() {
  $('#lista-participantes').replaceChildren(...estado.participantes.map(filaParticipante));
}

// ---------- exclusiones ----------

function renderExclusiones() {
  const conNombre = estado.participantes.filter((p) => p.nombre.trim());
  for (const selector of ['#excl-de', '#excl-a']) {
    const select = $(selector);
    const elegido = select.value;
    select.replaceChildren(...conNombre.map((p) => {
      const opcion = el('option', undefined, p.nombre.trim());
      opcion.value = p.id;
      return opcion;
    }));
    if (conNombre.some((p) => p.id === elegido)) select.value = elegido;
  }
  if ($('#excl-de').value === $('#excl-a').value && conNombre.length > 1) {
    $('#excl-a').value = conNombre.find((p) => p.id !== $('#excl-de').value).id;
  }

  $('#lista-exclusiones').replaceChildren(...estado.exclusiones.map((e) => {
    const texto = e.ambos
      ? `${nombreDe(e.de)} y ${nombreDe(e.a)} no se regalan entre sí`
      : `${nombreDe(e.de)} no regala a ${nombreDe(e.a)}`;
    const li = el('li', 'item');
    const quitar = boton('✕', () => {
      estado.exclusiones = estado.exclusiones.filter((x) => x !== e);
      cambio();
    }, 'icono');
    quitar.setAttribute('aria-label', `Quitar: ${texto}`);
    li.append(el('span', undefined, texto), quitar);
    return li;
  }));
}

function añadirExclusion() {
  const de = $('#excl-de').value;
  const a = $('#excl-a').value;
  const ambos = $('#excl-ambos').checked;
  if (!de || !a) return aviso('Primero escribe los nombres de los participantes.');
  if (de === a) return aviso('Elige dos personas distintas.');
  const yaExiste = estado.exclusiones.some((e) => (e.de === de && e.a === a) || (e.ambos && e.de === a && e.a === de));
  if (yaExiste && !ambos) return aviso('Esa exclusión ya está puesta.');
  // Una exclusión en ambos sentidos sustituye a las sueltas entre las mismas personas.
  if (ambos) estado.exclusiones = estado.exclusiones.filter((e) => !((e.de === de && e.a === a) || (e.de === a && e.a === de)));
  estado.exclusiones.push({ de, a, ambos });
  cambio();
}

// ---------- sorteo ----------

// Solo tiene sentido evitar repeticiones con el sorteo de un año anterior;
// rehacer el de este año no debe arrastrar restricciones del descartado.
const hayAnterior = () => Boolean(estado.sorteo) && estado.sorteo.año < añoActual();

function renderSorteo() {
  $('#lbl-historial').hidden = !hayAnterior();
  $('#evitar-historial').checked = evitarAnterior;
  if (estado.sorteo) $('#anio-historial').textContent = estado.sorteo.año;
}

async function paresDelSorteoAnterior() {
  const pares = [];
  for (const { token } of estado.sorteo?.enlaces ?? []) {
    try {
      const { pal, destinatario } = await descifrar(token);
      pares.push([pal, destinatario]);
    } catch { /* enlace dañado: se ignora */ }
  }
  return pares;
}

function validarParticipantes() {
  const participantes = estado.participantes
    .map((p) => ({ ...p, nombre: p.nombre.trim(), email: p.email.trim() }))
    .filter((p) => p.nombre || p.email);
  if (participantes.some((p) => !p.nombre)) return { error: 'Hay un correo sin nombre.' };
  if (participantes.length < MIN_PARTICIPANTES) return { error: `Hacen falta al menos ${MIN_PARTICIPANTES} participantes.` };

  const vistos = new Set();
  for (const { nombre } of participantes) {
    const clave = nombre.toLocaleLowerCase('es');
    if (vistos.has(clave)) return { error: `«${nombre}» está repetido. Usa nombres distintos (por ejemplo, con la inicial del apellido).` };
    vistos.add(clave);
  }
  const malEmail = participantes.find((p) => p.email && !EMAIL_VALIDO.test(p.email));
  if (malEmail) return { error: `El correo de ${malEmail.nombre} no parece válido.` };
  return { participantes };
}

async function hacerSorteo() {
  errorSorteo();
  const { participantes, error } = validarParticipantes();
  if (error) return errorSorteo(error);
  if (!estado.mensaje.includes('{destinatario}')) {
    return errorSorteo('El mensaje tiene que incluir {destinatario}; si no, nadie sabrá a quién le ha tocado.');
  }
  const obligatorios = marcadoresObligatorios(estado.mensaje);
  if (obligatorios.includes('presupuesto') && !estado.presupuesto.trim()) {
    return errorSorteo('Falta el presupuesto.');
  }
  if (obligatorios.includes('fecha') && !estado.fecha) {
    return errorSorteo('Falta la fecha de entrega (o ponla entre [corchetes] en el mensaje para que sea opcional).');
  }

  const nombres = participantes.map((p) => p.nombre);
  const prohibidos = [];
  for (const e of estado.exclusiones) {
    const de = nombreDe(e.de);
    const a = nombreDe(e.a);
    if (!de || !a) continue;
    prohibidos.push([de, a]);
    if (e.ambos) prohibidos.push([a, de]);
  }

  // Primero se explican los imposibles evidentes (sin mirar el sorteo anterior, que es secreto).
  const { sinDestinatario, sinRegalo } = sinOpciones(nombres, prohibidos);
  if (sinDestinatario.length) return errorSorteo(`${sinDestinatario.join(', ')} no puede regalar a nadie con estas exclusiones.`);
  if (sinRegalo.length) return errorSorteo(`Nadie puede regalar a ${sinRegalo.join(', ')} con estas exclusiones.`);

  const usarAnterior = evitarAnterior && hayAnterior();
  if (usarAnterior) prohibidos.push(...await paresDelSorteoAnterior());

  const asignacion = sortear(nombres, prohibidos);
  if (!asignacion) {
    return errorSorteo(usarAnterior
      ? 'No hay ninguna combinación que no repita parejas del sorteo anterior. Desmarca esa opción o quita alguna exclusión.'
      : 'No hay ninguna combinación posible con estas exclusiones. Quita alguna.');
  }

  if (estado.sorteo && !confirm('Ya hay un sorteo hecho. Si sorteas de nuevo, los enlaces que hayas mandado quedarán desfasados. ¿Sortear igualmente?')) return;

  const año = añoActual();
  const enlaces = await Promise.all(participantes.map(async (p) => ({
    pal: p.nombre,
    email: p.email,
    token: await cifrar({
      pal: p.nombre,
      destinatario: asignacion.get(p.nombre),
      año,
      presupuesto: estado.presupuesto.trim(),
      fecha: formatearFecha(estado.fecha),
      mensaje: estado.mensaje,
    }),
    enviado: false,
  })));

  estado.sorteo = { año, enlaces };
  evitarAnterior = false;
  cambio();
  $('#sec-resultados').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ---------- resultados ----------

function textoInvitacion(pal, año, enlace) {
  return `Querido ${pal},\n\nAbre este enlace para descubrir a quién te ha tocado regalar en el Pal Invisible de ${año}:\n${enlace}\n`;
}

function filaEnlace(item) {
  const { año } = estado.sorteo;
  const enlace = enlaceDe(item.token);
  const li = el('li', `item item-enlace${item.enviado ? ' enviado' : ''}`);

  const marcarEnviado = () => {
    item.enviado = true;
    li.classList.add('enviado');
    casilla.checked = true;
    guardarLocal();
  };

  const quien = el('div', 'quien');
  quien.append(el('strong', undefined, item.pal));
  if (item.email) quien.append(el('span', 'email', item.email));

  const acciones = el('div', 'acciones');
  const copiar = boton('Copiar enlace', async () => {
    try {
      await navigator.clipboard.writeText(enlace);
      copiar.textContent = '¡Copiado!';
      setTimeout(() => { copiar.textContent = 'Copiar enlace'; }, 1500);
    } catch {
      prompt(`Copia el enlace de ${item.pal}:`, enlace);
    }
    marcarEnviado();
  });
  acciones.append(copiar);

  if (navigator.share) {
    acciones.append(boton('Compartir', async () => {
      try {
        await navigator.share({ title: 'Pal Invisible', text: textoInvitacion(item.pal, año, '').trim(), url: enlace });
        marcarEnviado();
      } catch { /* cancelado por el usuario */ }
    }));
  }

  if (item.email && EMAIL_VALIDO.test(item.email)) {
    const correo = el('a', 'boton', 'Correo');
    const asunto = encodeURIComponent('Tu amigo invisible');
    const cuerpo = encodeURIComponent(textoInvitacion(item.pal, año, enlace));
    correo.href = `mailto:${item.email}?subject=${asunto}&body=${cuerpo}`;
    correo.addEventListener('click', marcarEnviado);
    acciones.append(correo);
  }

  const etiqueta = el('label', 'casilla enviado-check');
  const casilla = el('input');
  casilla.type = 'checkbox';
  casilla.checked = item.enviado;
  casilla.addEventListener('change', () => {
    item.enviado = casilla.checked;
    li.classList.toggle('enviado', item.enviado);
    guardarLocal();
  });
  etiqueta.append(casilla, ' Enviado');
  acciones.append(etiqueta);

  li.append(quien, acciones);
  return li;
}

function renderResultados() {
  const seccion = $('#sec-resultados');
  seccion.hidden = !estado.sorteo;
  if (!estado.sorteo) return;
  $('#anio-sorteo').textContent = estado.sorteo.año;
  $('#lista-enlaces').replaceChildren(...estado.sorteo.enlaces.map(filaEnlace));
}

// ---------- archivo ----------

function exportar() {
  const sufijo = estado.sorteo ? estado.sorteo.año : 'configuracion';
  descargar(`pal-invisible-${sufijo}.json`, aArchivo(estado));
}

async function importar(archivo) {
  if (archivo.size > 1_000_000) return aviso('Ese archivo es demasiado grande.');
  let nuevo;
  try {
    nuevo = desdeArchivo(JSON.parse(await archivo.text()));
  } catch (e) {
    return aviso(`No se pudo importar: ${e instanceof SyntaxError ? 'el archivo no es JSON válido' : e.message}.`);
  }
  const hayDatos = estado.participantes.some((p) => p.nombre.trim()) || estado.sorteo;
  if (hayDatos && !confirm('Se sustituirá lo que tienes ahora por el contenido del archivo. ¿Seguir?')) return;
  estado = nuevo;
  evitarAnterior = hayAnterior();
  cambio();
  aviso(estado.sorteo
    ? `Importado, con el sorteo de ${estado.sorteo.año}.`
    : 'Configuración importada.');
}

// ---------- arranque ----------

function cambio() {
  guardarLocal();
  render();
}

function render() {
  renderParticipantes();
  renderExclusiones();
  $('#mensaje').value = estado.mensaje;
  $('#presupuesto').value = estado.presupuesto;
  $('#fecha').value = estado.fecha;
  renderSorteo();
  renderResultados();
}

export function iniciarOrganizador() {
  estado = cargarLocal();
  evitarAnterior = hayAnterior();
  $('#organizador').hidden = false;

  $('#btn-anadir-participante').addEventListener('click', () => {
    estado.participantes.push({ id: nuevoId(), nombre: '', email: '' });
    cambio();
    $('#lista-participantes li:last-child input').focus();
  });
  $('#btn-anadir-exclusion').addEventListener('click', añadirExclusion);
  $('#mensaje').addEventListener('input', (ev) => {
    estado.mensaje = ev.target.value;
    guardarLocal();
  });
  $('#presupuesto').addEventListener('input', (ev) => {
    estado.presupuesto = ev.target.value;
    guardarLocal();
  });
  $('#fecha').addEventListener('input', (ev) => {
    estado.fecha = ev.target.value;
    guardarLocal();
  });
  $('#btn-restaurar-mensaje').addEventListener('click', () => {
    estado.mensaje = PLANTILLA_ORIGINAL;
    cambio();
  });
  $('#evitar-historial').addEventListener('change', (ev) => { evitarAnterior = ev.target.checked; });
  $('#btn-sortear').addEventListener('click', hacerSorteo);
  $('#btn-guardar-sorteo').addEventListener('click', exportar);
  $('#btn-exportar').addEventListener('click', exportar);
  $('#btn-importar').addEventListener('click', () => $('#input-importar').click());
  $('#input-importar').addEventListener('change', (ev) => {
    const [archivo] = ev.target.files;
    ev.target.value = '';
    if (archivo) importar(archivo);
  });
  $('#btn-reiniciar').addEventListener('click', () => {
    if (!confirm('Se borrarán participantes, exclusiones y el sorteo de este navegador. ¿Seguro? (Exporta antes si quieres conservarlos.)')) return;
    estado = estadoVacio();
    evitarAnterior = false;
    cambio();
  });

  render();
}
