const env = import.meta.env as Record<string, string | undefined>

/**
 * Para quién es este build: un club (turnos, caja, mostrador y torneos en su sede) o
 * una organización de torneos (sin canchas propias, juega en varios clubes).
 *
 * <p>Es el mismo código para los dos: lo que cambia es qué se ofrece. Tiene que coincidir
 * con {@code APP_MODO} del backend, que es el que de verdad apaga los endpoints.
 */
export type ModoInstalacion = 'CLUB' | 'ORGANIZADOR'

export const modo: ModoInstalacion = env.VITE_MODO?.trim().toUpperCase() === 'ORGANIZADOR' ? 'ORGANIZADOR' : 'CLUB'

export const esOrganizador = modo === 'ORGANIZADOR'
export const esClub = !esOrganizador
