# RankPadel para organizadores de torneos

El mismo sistema, en modo `ORGANIZADOR` (`APP_MODO` en el backend, `VITE_MODO` en el front).
No tiene turnos, caja, mostrador, stock ni clientes: es para quien arma torneos en canchas de
terceros. Todo lo de torneos es compartido con el sistema de clubes.

## El circuito de un torneo

1. **Crear el torneo** (Torneos → Nuevo): categorías, formato de cada una (zona, llave y
   finales: 3 sets, super tie-break, 1 set o a 9 games), costo por jugador y club principal.
2. **Clubes** (pestaña Clubes): sumar los clubes donde se juega, qué canchas cede cada uno, en
   qué días y horarios, y el monto acordado. Los pagos al club se registran ahí (en partes).
3. **Inscripciones**: los jugadores se anotan desde la web (con seña online opcional) y dicen
   cuándo no pueden jugar. Se aprueban en Inscripciones; también se cargan parejas a mano.
4. **Cobros** (pestaña Cobros): quién pagó y quién debe, jugador por jugador, en partes y por
   cualquier medio. "Recordar" abre WhatsApp con el saldo de cada uno.
5. **Sorteo** y **Horarios** (pestaña Horarios): "Armar horarios" propone dónde y cuándo va cada
   partido respetando canchas y franjas de cada club, restricciones de las parejas, descanso
   mínimo, jugadores en dos categorías y club fijo por categoría (Reglas). Se revisa y se
   aplica; después se mueve a mano lo que haga falta, con los choques a la vista.
6. **Avisos**: "Avisar a los jugadores del día" arma un WhatsApp por jugador con todos sus
   partidos (hora, club con dirección, cancha, rival). Queda marcado quién fue avisado y, si
   cambia un horario, quién hay que volver a avisar. La web pública tiene la página de
   horarios con el buscador "¿Cuándo juego?".
7. **Finanzas** (pestaña Finanzas, solo el dueño): premios (y su entrega), gastos, aportes de
   sponsors y el balance: ganancia proyectada y ganancia a hoy.

El **Panel** (inicio del admin) junta lo que hay que resolver en todos los torneos, cómo viene
cada uno (cupos, horarios, cobros, deuda con clubes) y cuánto dejaron los que terminaron.

## Roles

- **Dueño**: todo.
- **Mostrador** (colaborador): torneos, horarios, avisos y cobro de inscripciones. No ve
  montos acordados con clubes, finanzas ni ganancias, y no puede anular cobros.

## Levantarlo en local

Hace falta Java 21, Node 20+ y un MySQL 8 (instalado o con Docker:
`docker run -d --name rankpadel-mysql -e MYSQL_ROOT_PASSWORD=root -p 3306:3306 mysql:8.0`).

Backend (repo `padel`), en Windows PowerShell:

```powershell
$env:DB_PASSWORD = "root"          # la contraseña del root de tu MySQL
$env:APP_MODO = "ORGANIZADOR"      # o CLUB
.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=dev"
```

(En Mac/Linux: `DB_PASSWORD=root APP_MODO=ORGANIZADOR ./mvnw spring-boot:run -Dspring-boot.run.profiles=dev`.)
La base `rankpadel_db` se crea sola. Queda en http://localhost:8080.

Frontend (repo `padel-front`): crear `.env.local` con

```
VITE_API_BASE_URL=http://localhost:8080
VITE_MODO=ORGANIZADOR
```

y correr `npm install` y `npm run dev`. Queda en http://localhost:5173 (panel: `/admin`,
usuario `admin`, contraseña `admin123` en desarrollo).

Datos de prueba: cargar un club con canchas desde el panel y después
`node scripts/sembrar-torneos.mjs --api http://localhost:8080 --usuario admin --clave admin123`
(en el repo `padel`).
