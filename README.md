# 🎁 Pal Invisible

Sorteo de amigo invisible que funciona en cualquier navegador, **sin servidores ni cuentas**.

El organizador mete los participantes y quién no puede regalar a quién, pulsa **Sortear** y recibe un enlace secreto para cada persona. Cada uno abre el suyo y descubre a quién le ha tocado regalar.

## Cómo funciona

1. **Participantes**: nombre y, si quieres, correo.
2. **Exclusiones**: parejas, hermanos… en un sentido o en los dos.
3. **Mensaje**: el texto que verá cada uno, con `{pal}`, `{destinatario}` y `{año}`.
4. **Sortear**: se genera un enlace por participante, que puedes copiar, compartir (WhatsApp, Telegram… desde el móvil) o mandar por correo con tu propio cliente.

Quien abre su enlace ve primero un sobre cerrado («Mensaje para Ana») y solo al pulsar **Descubrir** aparece su asignación. Así no se destapa por accidente en una vista previa o con alguien mirando.

### Año tras año

- **Exportar / Importar** guarda en un archivo `.json` los participantes, las exclusiones, el mensaje y el sorteo.
- Si alguien pierde su enlace, importa el archivo y vuelve a mandárselo.
- El año siguiente, al importar el archivo, aparece la opción **No repetir las parejas del sorteo guardado**. Las parejas se leen de los enlaces sin mostrarse en pantalla.

## Privacidad

- Todo ocurre en el navegador. No hay base de datos, cookies de seguimiento ni peticiones a ningún servidor. La política de seguridad de la página (CSP) lo impide.
- La asignación va cifrada (AES-GCM) en el fragmento del enlace (la parte tras `#`). Los navegadores **nunca envían** esa parte al servidor, ni a GitHub ni a las vistas previas de WhatsApp.
- La clave va dentro del propio enlace. El cifrado evita que se lea a simple vista, pero **quien tenga un enlace puede abrirlo**. El organizador podría mirar los de los demás si quisiera: es un juego de confianza, como siempre.
- Los participantes y el sorteo se guardan en el `localStorage` de tu navegador para no perder nada si cierras la pestaña. **Empezar de cero** lo borra.

## Usarlo

### Publicado en GitHub Pages

1. Sube el repositorio a GitHub.
2. *Settings → Pages → Build and deployment*: elige `Deploy from a branch`, rama `main`, carpeta `/ (root)`.
3. En un minuto estará en `https://<tu-usuario>.github.io/pal-invisible/`.

### En local

Los módulos de JavaScript no funcionan abriendo el archivo con doble clic (`file://`). Hace falta un servidor:

```bash
python -m http.server 8000
```

Después abre <http://localhost:8000>. Los enlaces generados en local apuntan a `localhost` y solo sirven en tu ordenador. Para mandarlos de verdad, usa la versión publicada.

## Desarrollo

No hay dependencias ni paso de compilación: HTML, CSS y JavaScript nativos.

```
index.html          Página única: herramienta del organizador y vista del participante
css/estilos.css
js/app.js           Decide qué vista mostrar (con o sin #enlace)
js/organizador.js   Interfaz del organizador
js/revelar.js       Vista del participante
js/sorteo.js        Algoritmo del sorteo con restricciones
js/enlace.js        Cifrado / descifrado de los enlaces
js/archivo.js       Formato de exportar / importar
js/mensaje.js       Plantilla del mensaje
js/correo.js        Qué enlace toca con «Mandar siguiente»
tests/              Tests con el runner nativo de Node
```

Tests (Node 22 o superior):

```bash
npm test
```

### El sorteo

Primero prueba permutaciones al azar, que hacen que todas las combinaciones válidas sean igual de probables. Si las restricciones son tan estrictas que no sale ninguna, pasa a una búsqueda con vuelta atrás que encuentra una solución si existe. Esa búsqueda tiene un límite de pasos: si lo alcanza sin decidir, avisa de que no ha podido comprobarlo y pide quitar alguna exclusión. Si no existe solución, explica el motivo cuando es evidente, por ejemplo: «Ana no puede regalar a nadie con estas exclusiones».

## Historia

La primera versión era un script de Python que leía los participantes de una Google Sheet y enviaba los correos por SMTP. Esta versión web la sustituye: ya no hacen falta credenciales, y nadie puede ver todas las parejas en una hoja compartida.
