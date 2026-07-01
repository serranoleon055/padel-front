# Ideas de producto — Mirada "empresa de canchas" (Fase 2)

Contexto: el sistema arrancó orientado a torneos/ranking, pero el negocio real es una sede
de pádel en Santiago del Estero (6 canchas, bar, vestuarios). Estas ideas amplían la mirada
hacia el cliente que viene a jugar, no solo al jugador de torneos. No se implementan en esta
tanda; quedan priorizadas para fases siguientes.

## Prioridad alta (impacto directo en reservas/ingresos)

1. **Estado de canchas en vivo (público)**: grilla de las 6 canchas con disponibilidad de hoy
   (libre / ocupada / reservada) leyendo `reservas` + `horarios_cancha` + `bloqueos_cancha`.
   Ya existe la lógica de slots (`SlotDisponibilidad`), faltaría una vista pública resumida.
2. **Reservar destacado en el inicio**: bloque en el home con "Reservá tu cancha" + próximos
   horarios libres de hoy/mañana, enlazando a `/reservar`. Hoy "Reservar" es solo un ítem de menú.
3. **Precios y horarios visibles**: sección pública con tarifas por horario (pico/valle), duración
   de turnos y formas de pago. Da confianza y reduce consultas por WhatsApp.

## Prioridad media (experiencia y fidelización)

4. **Servicios de la sede**: bar, vestuarios, alquiler de paletas, estacionamiento, wifi.
   Tarjetas simples en una página "La sede" con fotos.
5. **Profesores / clases**: listado de profes, niveles, horarios de clases y reserva de turno
   de clase (puede reutilizar el motor de reservas con un tipo distinto).
6. **Fidelización / promos**: "jugá X veces y la siguiente con descuento", happy hours,
   combos con bar. Empieza como contenido informativo y luego puede integrarse a pagos.
7. **Contacto enriquecido**: ubicación con mapa, WhatsApp directo, redes, horario de atención.
   La página de contacto hoy es mínima.

## Prioridad baja (a futuro)

8. **Galería de la sede** (fotos de canchas, bar, eventos).
9. **Liga interna / mixtos recurrentes** anunciados en el home.
10. **Notificaciones por WhatsApp** de confirmación/recordatorio de reserva y turno.

## Notas técnicas

- Mucho de esto se apoya en datos/entidades que ya existen (`Cancha`, `Reserva`, `HorarioCancha`,
  `BloqueoCancha`, `Pago`), por lo que el grueso del trabajo es de UI pública + algún endpoint de
  lectura agregada.
- "Precios", "Servicios" y "Profesores" pueden arrancar como contenido estático/configurable antes
  de necesitar tablas nuevas.
