// Qué enlace toca mandar por correo con el botón «Mandar siguiente».

export const EMAIL_VALIDO = /^[^\s@<>()",;:?&#%]+@[^\s@<>()",;:?&#%]+\.[^\s@<>()",;:?&#%]+$/;

/** El primer enlace sin enviar con un correo válido, o undefined si no queda ninguno. */
export const siguientePorCorreo = (enlaces) =>
  enlaces.find((e) => !e.enviado && EMAIL_VALIDO.test(e.email ?? ''));
