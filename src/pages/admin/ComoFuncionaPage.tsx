import { Banknote, CalendarClock, CalendarSync, Contact, HelpCircle, Mail, Package, ShoppingCart, Trophy, UserX } from 'lucide-react'
import { useMemo, useState } from 'react'

import { AdminPageHeader } from '@/shared/ui/AdminPageHeader'
import { Input } from '@/shared/ui/Input'

type Regla = { pregunta: string; respuesta: string }
type Bloque = { titulo: string; icono: typeof Trophy; reglas: Regla[] }

/**
 * Las reglas que el sistema aplica solo, escritas como las preguntaría el dueño del
 * club. Sirve para dos cosas: que no haya que preguntar "¿esto por qué hizo esto?" y
 * que quien atiende el mostrador sepa qué esperar sin que lo capaciten de nuevo.
 */
const BLOQUES: Bloque[] = [
  {
    titulo: 'Avisos por mail',
    icono: Mail,
    reglas: [
      {
        pregunta: '¿Cuándo me manda un mail el sistema?',
        respuesta: 'Solo en cuatro casos: cuando alguien pide un turno desde la web, cuando alguien se inscribe a un torneo, cuando un turno fijo no se pudo agendar porque el horario ya estaba ocupado, y cuando entró una seña por un turno que ya no estaba disponible. Nada más.',
      },
      {
        pregunta: '¿A qué dirección llegan?',
        respuesta: 'Al email cargado en Configuración de la sede, en el bloque Contacto. Si está vacío, no sale ningún aviso. Podés probarlo con el botón "Enviar mail de prueba".',
      },
      {
        pregunta: '¿El sistema le manda mails a los clientes?',
        respuesta: 'No. Al cliente nunca se le escribe por mail. La confirmación del turno la hacés vos por WhatsApp, con el botón que aparece al lado de cada teléfono.',
      },
      {
        pregunta: 'Dice "los avisos por mail todavía no están activados". ¿Qué significa?',
        respuesta: 'Que al sistema todavía no se le conectó una casilla desde donde enviar. Es una configuración técnica que se hace una vez al instalar y no se carga desde el panel. Mientras tanto todo funciona igual, pero los turnos hay que verlos entrando al panel.',
      },
    ],
  },
  {
    titulo: 'Turnos',
    icono: CalendarClock,
    reglas: [
      {
        pregunta: '¿Cuánto dura un turno pendiente antes de liberarse?',
        respuesta: 'Un turno pedido sin pagar se guarda un rato y después se libera solo. El reloj empieza a correr cuando el club abre, no cuando el cliente lo pidió: si alguien pide un turno a las 3 de la mañana, no se le vence antes de que vos puedas verlo. El tope siempre es el inicio del turno.',
      },
      {
        pregunta: 'Si pagó la seña online, ¿también se vence?',
        respuesta: 'Sí, pero ahí la ventana es la del pago de Mercado Pago y corre desde que lo pidió. Si el pago entra tarde, el turno ya no se toma: el sistema lo marca como "Devolver seña" en el panel y te avisa por mail.',
      },
      {
        pregunta: '¿Qué precio se cobra si después cambio la tarifa?',
        respuesta: 'El que estaba vigente el día que se reservó. El precio queda congelado en el turno, así el histórico y la facturación no se mueven cuando actualizás la lista.',
      },
      {
        pregunta: '¿Cómo se calcula el precio de cada horario?',
        respuesta: 'Si hay una promoción vigente que cubre ese día y esa hora, manda la promoción. Si no, manda el precio por hora de la cancha. Cada hora se cotiza por separado: un turno de 2 horas que cruza el fin de una promoción suma los dos precios distintos.',
      },
      {
        pregunta: '¿Un horario ocupado puede volver a venderse?',
        respuesta: 'No. El horario queda tomado si el turno está pendiente, confirmado, finalizado o marcado como ausente. Solo se libera si se cancela, se rechaza o se vence.',
      },
    ],
  },
  {
    titulo: 'Cuando el cliente no vino',
    icono: UserX,
    reglas: [
      {
        pregunta: '¿Cuándo puedo marcar un ausente?',
        respuesta: 'Solo una vez que el turno empezó, y solo si estaba confirmado o finalizado. Si te equivocaste, se deshace con el botón de al lado.',
      },
      {
        pregunta: '¿Se libera la cancha?',
        respuesta: 'No, y es a propósito: la cancha estuvo bloqueada igual, nadie más pudo usarla, y el registro tiene que quedar.',
      },
      {
        pregunta: '¿Cuánto factura un ausente?',
        respuesta: 'Solo la seña que ya estaba cobrada. Si no hubo seña online, no factura nada. Contar el turno entero inflaría los números con plata que nunca entró.',
      },
    ],
  },
  {
    titulo: 'Turnos fijos (abonos)',
    icono: CalendarSync,
    reglas: [
      {
        pregunta: '¿Cómo se generan?',
        respuesta: 'Vos definís cancha, día, hora y vigencia, y el sistema agenda los turnos concretos seis semanas hacia adelante, ya confirmados y sin vencimiento. Se vuelve a correr solo una vez por día.',
      },
      {
        pregunta: 'Si cancelo una semana porque el cliente no viene, ¿se vuelve a crear?',
        respuesta: 'No. La generación saltea cualquier fecha que ya tenga un turno cargado, en el estado que sea. Una semana cancelada queda cancelada.',
      },
      {
        pregunta: '¿Qué pasa si el horario ya está ocupado?',
        respuesta: 'El sistema no pisa nunca un turno existente. Al cargar el abono se valida que no se superponga con otro abono ni con turnos ya agendados, y no te deja guardarlo. Si el choque aparece después, te llega un mail con el detalle para que reubiques.',
      },
      {
        pregunta: '¿Cómo se reparte el precio del abono?',
        respuesta: 'El precio que pactás es del turno completo y se reparte proporcionalmente entre las horas que ocupa.',
      },
    ],
  },
  {
    titulo: 'La cuenta del turno',
    icono: ShoppingCart,
    reglas: [
      {
        pregunta: '¿Cómo le cobro la cancha y las bebidas de una sola vez?',
        respuesta: 'Desde el turno, con el botón del carrito, cargás lo que consumieron y elegís "A la cuenta del turno". Al final, el botón de cobrar te pide un solo monto con todo junto: cancha más consumo, menos la seña.',
      },
      {
        pregunta: '¿Qué diferencia hay con una venta suelta?',
        respuesta: 'La venta suelta se cobra en el momento y entra a la caja al toque. Lo que va a la cuenta todavía no es plata que entró: es deuda del turno, y recién suma al arqueo cuando cobrás.',
      },
      {
        pregunta: '¿Puedo anotar un consumo sin turno?',
        respuesta: 'No. Sin turno y sin medio de pago sería plata que se pierde de vista, así que el sistema no lo deja: o elegís cómo pagó, o lo cargás a un turno.',
      },
      {
        pregunta: 'El turno se canceló y igual consumieron. ¿Qué hago?',
        respuesta: 'Cobralo en el momento como venta suelta. En un turno cancelado no hay cuenta contra la que anotar.',
      },
    ],
  },
  {
    titulo: 'Caja y cobros',
    icono: Banknote,
    reglas: [
      {
        pregunta: '¿Qué entra al cierre de caja?',
        respuesta: 'Todo lo que se cobró en el mostrador ese día: saldos de turnos y ventas del kiosco, separado por medio de pago. Las señas cobradas por Mercado Pago se muestran aparte, porque esa plata va a la cuenta y no al cajón.',
      },
      {
        pregunta: '¿Por qué el efectivo esperado me da menos de lo que cobré?',
        respuesta: 'Porque se le restan los gastos que pagaste en efectivo ese día. Si le pagaste al gasista del cajón, esa plata ya no está y el arqueo tiene que reflejarlo.',
      },
      {
        pregunta: '¿Puedo cobrar de más?',
        respuesta: 'No. El sistema no deja cobrar más que el saldo pendiente ni cobrar turnos cancelados: es el error de tipeo típico del mostrador.',
      },
      {
        pregunta: 'Cargué una factura de julio en agosto. ¿En qué mes pesa?',
        respuesta: 'En julio. El gasto se imputa por su fecha, no por el día en que lo cargaste.',
      },
    ],
  },
  {
    titulo: 'Productos y stock',
    icono: Package,
    reglas: [
      {
        pregunta: '¿El stock puede quedar mal?',
        respuesta: 'No debería: todo cambio de stock queda registrado como un movimiento (venta, compra, ajuste, merma, anulación). El número que ves siempre es la suma de esos movimientos, incluido el stock inicial que cargaste al dar de alta el producto.',
      },
      {
        pregunta: '¿Qué es un producto que no controla stock?',
        respuesta: 'Lo que no se agota: alquiler de paleta, café. Se puede vender siempre y no descuenta nada. Sobre esos productos no se puede comprar, ajustar ni cargar merma.',
      },
      {
        pregunta: 'Si actualizo la lista de precios, ¿cambia lo ya vendido?',
        respuesta: 'No. El precio y el costo quedan congelados en cada venta, así el margen histórico no se mueve.',
      },
      {
        pregunta: '¿Cuándo una compra se convierte en gasto?',
        respuesta: 'Cuando cargás con qué medio la pagaste: ahí se genera un gasto de categoría Insumos y pesa en la rentabilidad. Si no ponés medio de pago, solo sube el stock (mercadería ya paga o anotada por otro lado).',
      },
      {
        pregunta: 'Anulé una venta. ¿Qué pasa con el stock?',
        respuesta: 'Vuelve a entrar y queda registrado como anulación. La venta se borra, pero el rastro del movimiento queda.',
      },
    ],
  },
  {
    titulo: 'Clientes',
    icono: Contact,
    reglas: [
      {
        pregunta: '¿Cómo sabe el sistema que es el mismo cliente?',
        respuesta: 'Por el teléfono. Lo normaliza antes de comparar, así el mismo número escrito de tres formas distintas no genera tres fichas. La ficha se arma sola con la primera reserva.',
      },
      {
        pregunta: 'Reservó como "Juan" y después como "Grupo del jueves". ¿Cuál queda?',
        respuesta: 'Queda el primer nombre y no se pisa nunca, pero la ficha te muestra los otros nombres con los que ese teléfono reservó y te deja elegir cuál dejar como principal.',
      },
      {
        pregunta: '¿Puedo ponerle a una ficha el teléfono de otra?',
        respuesta: 'No: el sistema te avisa de quién es ese número y no lo deja duplicar.',
      },
    ],
  },
  {
    titulo: 'Torneos y ranking',
    icono: Trophy,
    reglas: [
      {
        pregunta: '¿El cupo es del torneo o de la categoría?',
        respuesta: 'De la categoría. Cada categoría tiene su propio cupo, formato, puntaje y tipo de sorteo. El número del torneo entero es la suma de los cupos de sus categorías.',
      },
      {
        pregunta: '¿Qué pasa si una categoría no llegó al cupo?',
        respuesta: 'Se juega igual. El cuadro se completa con BYE para las mejores parejas, que pasan la primera ronda sin jugar.',
      },
      {
        pregunta: '¿Un walkover suma puntos?',
        respuesta: 'No. El walkover no suma nada. El retiro sí suma puntos normales, porque el partido se empezó a jugar.',
      },
      {
        pregunta: '¿Por qué el ranking está vacío?',
        respuesta: 'Porque no hay una temporada activa. El ranking es siempre de la temporada activa: activar una nueva desactiva la anterior y el conteo arranca de cero.',
      },
      {
        pregunta: '¿Qué significa la columna "Mov."?',
        respuesta: 'Cuántos puestos subió o bajó la pareja desde la última vez que su posición realmente cambió. Si un recálculo no la movió, la flecha se queda como estaba.',
      },
    ],
  },
]

export default function ComoFuncionaPage() {
  const [busqueda, setBusqueda] = useState('')

  const bloques = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    if (!texto) return BLOQUES
    return BLOQUES
      .map((bloque) => ({
        ...bloque,
        reglas: bloque.reglas.filter(
          (regla) => regla.pregunta.toLowerCase().includes(texto) || regla.respuesta.toLowerCase().includes(texto),
        ),
      }))
      .filter((bloque) => bloque.reglas.length > 0)
  }, [busqueda])

  return (
    <section>
      <AdminPageHeader title={<><HelpCircle size={26} />Cómo funciona</>} />
      <p className="mt-2 max-w-2xl text-sm text-rp-muted">
        Las reglas que el sistema aplica solo, sin que nadie las toque. Si algo pasó y no
        entendés por qué, la respuesta está acá.
      </p>

      <Input
        className="mt-4 max-w-md"
        placeholder="Buscar (seña, stock, ausente, cupo...)"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
      />

      {bloques.length === 0 ? (
        <p className="mt-6 text-sm text-rp-muted">No hay ninguna regla que hable de "{busqueda}".</p>
      ) : (
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {bloques.map((bloque) => (
            <div key={bloque.titulo} className="rounded-lg border border-rp-border bg-rp-surface/82 p-4">
              <h2 className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-rp-accent">
                <bloque.icono size={15} />{bloque.titulo}
              </h2>
              <dl className="flex flex-col divide-y divide-rp-border">
                {bloque.reglas.map((regla) => (
                  <div key={regla.pregunta} className="py-2.5 first:pt-0 last:pb-0">
                    <dt className="text-sm font-bold text-rp-text">{regla.pregunta}</dt>
                    <dd className="mt-1 text-sm leading-6 text-rp-muted">{regla.respuesta}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
