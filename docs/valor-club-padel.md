# Valor para un club de pádel — RankPadel

Análisis de diferenciales de marca y de inteligencia de negocio que hacen a RankPadel
vendible como producto profesional. No es una lista de features a implementar ya: es el
mapa de valor. Las features concretas se eligen y priorizan después.

---

## A. Diferenciales de MARCA (cara al cliente) — alto impacto

Lo que el jugador ve y siente. Genera fidelidad y hace que el club se vea profesional.

### Perfil de jugador rico

Ya existe una base (perfil público con ranking, torneos y últimos partidos). Profundizarlo:

- **Historial completo**: todos los torneos y partidos, con marcador y rival.
- **Win rate y rachas**: porcentaje de victorias, racha actual y mejor racha.
- **Compañeros frecuentes**: con quién juega y con quién le va mejor.
- **Próximos turnos y torneos**: agenda personal del jugador.
- **Evolución en el ranking**: cómo subió/bajó a lo largo de la temporada.

**Por qué importa:** el jugador vuelve a la app para verse a sí mismo. Es el enganche que
transforma un sistema de reservas en una comunidad.

---

## B. Datos que un club querría (panel admin / inteligencia de negocio) — alto impacto

Lo que el dueño del club necesita para tomar decisiones y ganar más.

### Mapa de ocupación por cancha y franja horaria (heatmap semanal)

Ver las horas pico y valle reales por cancha y día. Permite:

- Ajustar precios por franja (dinámico: más caro en pico, promo en valle).
- Detectar canchas subutilizadas.

### Ingresos por período y por fuente

- Turnos.
- Comparativa mes a mes y temporada a temporada.
- Ingreso proyectado según reservas confirmadas.

### Tasa de no-show y de cancelación

- Por cliente y por franja horaria.
- Base para políticas de seña (quién exige seña, cuánta).

### Ranking de canchas más usadas y horas muertas

- Qué cancha rinde más y cuáles quedan vacías.
- Insumo para promos y mantenimiento.

### Embudo de torneos

- Inscriptos vs cupo por torneo y categoría.
- Ingresos por torneo.
- Categorías más demandadas (dónde conviene abrir más cupos).

---

## Estado actual (base ya construida)

- Reservas de turnos con seña online (Mercado Pago configurable) y confirmación manual.
- Torneos por categoría con formato/plantillas/puntos independientes por categoría.
- Ranking por temporada (reset), por categoría.
- Dashboard admin por lugar: canchas ocupadas/libres, turnos del día, ingreso estimado de
  turnos, próximos turnos por cancha, turnos por confirmar e inscripciones pendientes.
- Perfil público de jugador con ranking, torneos y partidos.

Sobre esta base, los diferenciales A y B son incrementales y de alto retorno.
