import { BookOpen, Shuffle, Star, Target, Trophy } from 'lucide-react'
import type { ReactNode } from 'react'

import { brand } from '@/config/brand'

function Seccion({ icon, titulo, children }: { icon: ReactNode; titulo: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-rp-border bg-rp-surface/82 p-5 sm:p-6">
      <h2 className="flex items-center gap-2 text-lg font-black text-rp-text">
        <span className="text-rp-accent">{icon}</span>
        {titulo}
      </h2>
      <div className="mt-3 flex flex-col gap-3 text-sm leading-relaxed text-rp-muted">{children}</div>
    </section>
  )
}

function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <p>
      <strong className="text-rp-text">{etiqueta}:</strong> {children}
    </p>
  )
}

export default function ReglasPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-rp-accent">
        <BookOpen size={14} /> Cómo funciona
      </div>
      <h1 className="mt-2 text-3xl font-black text-rp-text sm:text-4xl">Reglas y funcionamiento</h1>
      <p className="mt-3 text-sm leading-relaxed text-rp-muted">
        Cómo se organizan los torneos de {brand.name}: formatos, armado del cuadro, puntos y ranking.
        Pensado para que jugadores y organizadores sepan exactamente qué esperar.
      </p>

      <div className="mt-8 flex flex-col gap-4">
        <Seccion icon={<Target size={18} />} titulo="Formatos de torneo">
          <Dato etiqueta="Liga">Todos contra todos (round-robin) en una sola tabla. No hay eliminación: gana quien termina primero en la tabla.</Dato>
          <Dato etiqueta="Eliminación directa">Cuadro directo: el que pierde queda afuera. Sin fase de grupos.</Dato>
          <Dato etiqueta="Minitorneo">Fase de grupos + eliminación, en formato corto. Por defecto se juega a 1 set.</Dato>
          <Dato etiqueta="Torneo largo">Fase de grupos + eliminación, al mejor de 3 sets.</Dato>
          <p className="rounded-md border border-rp-border bg-rp-bg/55 px-3 py-2 text-xs">
            La estructura concreta (cuántos grupos, cuántas parejas avanzan) la define la <strong className="text-rp-text">plantilla de formato</strong> que elige el organizador.
          </p>
        </Seccion>

        <Seccion icon={<Shuffle size={18} />} titulo="Cómo se arma el cuadro">
          <p><strong className="text-rp-text">Fase de grupos:</strong> las parejas se reparten en grupos y juegan todas contra todas dentro del grupo. Cada victoria suma 3 puntos; se ordena por puntos y, si hay empate, por diferencia de sets y de juegos.</p>
          <p><strong className="text-rp-text">Clasificación a la eliminación:</strong> avanzan las primeras de cada grupo (la cantidad la define el torneo: 1°, 1° y 2°, etc.).</p>
          <p><strong className="text-rp-text">Cruces fijos por posición:</strong> los clasificados se cruzan de forma predecible cruzando primeros de un grupo contra segundos de otro. Por ejemplo, con 4 grupos (A, B, C, D) y 2 que avanzan:</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {['1° A  vs  2° D', '1° D  vs  2° A', '1° B  vs  2° C', '1° C  vs  2° B'].map((cruce) => (
              <div key={cruce} className="rounded-md border border-rp-border bg-rp-bg/55 px-3 py-2 text-center text-sm font-bold text-rp-text">{cruce}</div>
            ))}
          </div>
          <p>Lo que ves en el cuadro previo es exactamente lo que se juega: el preview y el sorteo usan la misma regla, y nunca se cruzan en primera ronda dos parejas del mismo grupo.</p>
          <p><strong className="text-rp-text">Cantidades que no son potencia de 2:</strong> si los clasificados no llegan a 8, 16, etc., el cuadro se completa con <strong className="text-rp-text">BYE</strong> (pase libre) para las mejores parejas, que avanzan sin jugar la primera ronda. Así también se juegan torneos con cupos incompletos.</p>
        </Seccion>

        <Seccion icon={<Star size={18} />} titulo="Puntos por torneo">
          <p>Cada torneo usa una <strong className="text-rp-text">plantilla de puntos</strong> que define cuántos puntos da cada ronda, al ganador y al perdedor. Por ejemplo:</p>
          <div className="overflow-hidden rounded-md border border-rp-border">
            <table className="w-full text-sm">
              <thead className="bg-rp-bg/55 text-xs uppercase tracking-wide text-rp-muted">
                <tr><th className="px-3 py-2 text-left">Ronda</th><th className="px-3 py-2 text-right">Ganador</th><th className="px-3 py-2 text-right">Perdedor</th></tr>
              </thead>
              <tbody className="text-rp-text">
                {[['Grupos', '10', '-5'], ['Octavos', '20', '10'], ['Cuartos', '40', '20'], ['Semifinal', '70', '40'], ['Final', '100', '70']].map((fila) => (
                  <tr key={fila[0]} className="border-t border-rp-border">
                    <td className="px-3 py-2 font-bold">{fila[0]}</td>
                    <td className="px-3 py-2 text-right">{fila[1]}</td>
                    <td className="px-3 py-2 text-right">{fila[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>Los puntos se asignan <strong className="text-rp-text">a cada jugador de la pareja</strong> en cada partido finalizado. En este ejemplo, perder en la fase de grupos <strong className="text-rp-text">resta 5 puntos</strong>: el organizador puede usar valores negativos para penalizar la derrota.</p>
          <p>Aun con plantillas que restan, el <strong className="text-rp-text">ranking nunca baja de 0</strong>: si el total quedara negativo, se mantiene en cero.</p>
          <p className="text-xs">Es un ejemplo: cada club define sus propias plantillas. Hay torneos que no suman al ranking (amistosos, benéficos).</p>
        </Seccion>

        <Seccion icon={<Trophy size={18} />} titulo="Ranking por temporada">
          <p>El ranking acumula los puntos que cada jugador gana en los torneos que suman ranking, dentro de la <strong className="text-rp-text">temporada activa</strong>.</p>
          <ul className="ml-4 list-disc space-y-1">
            <li>Hay un ranking por <strong className="text-rp-text">categoría</strong> dentro de cada temporada.</li>
            <li>El ranking que se muestra es siempre el de la <strong className="text-rp-text">temporada activa</strong>. Si no hay ninguna activa, no se muestran posiciones.</li>
            <li>Al activar una nueva temporada, la anterior se cierra y el ranking <strong className="text-rp-text">arranca de cero</strong>: cada temporada es una competencia nueva.</li>
            <li>Se ordena por <strong className="text-rp-text">puntos</strong>; si hay empate, por más victorias y menos derrotas.</li>
            <li>Los puntos <strong className="text-rp-text">nunca bajan de 0</strong>: si una plantilla resta puntos, el total tiene piso en cero.</li>
            <li>Cada jugador muestra su posición, su tendencia (subió/bajó) y cuántos torneos jugó.</li>
          </ul>
        </Seccion>

        <Seccion icon={<Target size={18} />} titulo="Cómo se cargan los resultados">
          <p>Los marcadores siguen las reglas del pádel:</p>
          <ul className="ml-4 list-disc space-y-1">
            <li>Un set se gana llegando a <strong className="text-rp-text">6 juegos con 2 de diferencia</strong>, o <strong className="text-rp-text">7-5</strong> / <strong className="text-rp-text">7-6</strong> (tie-break).</li>
            <li>Los torneos pueden ser a <strong className="text-rp-text">1 set</strong> (minitorneo) o al <strong className="text-rp-text">mejor de 3</strong>.</li>
            <li>El set decisivo se juega como un <strong className="text-rp-text">set normal</strong> (a 6 con +2, o 7-5 / 7-6).</li>
          </ul>
        </Seccion>
      </div>

      <p className="mt-8 text-center text-xs text-rp-muted">
        ¿Dudas sobre un torneo puntual? Escribinos a {brand.email}.
      </p>
    </section>
  )
}
