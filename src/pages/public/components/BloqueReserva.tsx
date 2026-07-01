import { CalendarClock, MapPin } from 'lucide-react'
import { NavLink } from 'react-router-dom'

import { useConfiguracionSede } from '@/app/providers/ConfiguracionSedeContext'

export function BloqueReserva() {
  const { configuracion } = useConfiguracionSede()

  return (
    <section className="reserva-band">
      <div className="reserva-band-inner">
        <div className="reserva-band-info">
          <div className="reserva-band-eyebrow"><CalendarClock size={14} />RESERVÁ TU CANCHA</div>
          <h2 className="reserva-band-title">Asegurá tu turno online</h2>
          <p className="reserva-band-desc">Elegí día y horario, reservá en segundos y pagá la seña para confirmar. Sin llamados ni esperas.</p>
          <NavLink to="/reservar" className="btn-primary">
            <MapPin size={17} />
            Reservar ahora
          </NavLink>
        </div>

        {configuracion.horarios.length > 0 && (
          <div className="reserva-band-horarios">
            <div className="reserva-band-slots-title">Horarios de atención</div>
            <ul>
              {configuracion.horarios.map((horario) => (
                <li key={horario.dias}>
                  <span>{horario.dias}</span>
                  <strong>{horario.horas}</strong>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  )
}
