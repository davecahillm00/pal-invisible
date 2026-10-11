import { iniciarOrganizador } from './organizador.js';
import { iniciarRevelado } from './revelar.js';

// Con fragmento (#...) es el enlace de un participante; sin él, la herramienta del organizador.
const token = location.hash.slice(1);
if (token) iniciarRevelado(token);
else iniciarOrganizador();

window.addEventListener('hashchange', () => location.reload());
