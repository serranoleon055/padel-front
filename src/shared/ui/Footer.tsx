import { Mail, MapPin, Phone } from 'lucide-react'
import { memo } from 'react'
import { NavLink } from 'react-router-dom'

import { useConfiguracionSede } from '@/app/providers/ConfiguracionSedeContext'
import { brand } from '@/config/brand'
import { whatsappUrl } from '@/config/sede'
import { IconoFacebook, IconoInstagram, IconoWhatsApp } from '@/shared/ui/SocialIcons'

const CURRENT_YEAR = new Date().getFullYear()

export const Footer = memo(function Footer() {
  const { configuracion } = useConfiguracionSede()
  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <div className="footer-brand">
          <div className="footer-logo-row">
            <span className="footer-logo-icon" aria-hidden="true" />
            <div>
              <div className="footer-logo-text">{brand.name}</div>
              <div className="footer-logo-sub">{brand.location}</div>
            </div>
          </div>

          <p className="footer-desc">
            Plataforma de torneos y ranking de padel. Datos organizados por categoria, actividad y rendimiento deportivo.
          </p>

          <div className="footer-socials">
            <a href={configuracion.instagram ?? '#'} target="_blank" rel="noreferrer" className="fsoc" aria-label="Instagram">
              <IconoInstagram size={18} />
            </a>
            <a href={configuracion.facebook ?? '#'} target="_blank" rel="noreferrer" className="fsoc" aria-label="Facebook">
              <IconoFacebook size={18} />
            </a>
            <a href={whatsappUrl(configuracion.whatsapp)} target="_blank" rel="noreferrer" className="fsoc" aria-label="WhatsApp">
              <IconoWhatsApp size={18} />
            </a>
          </div>
        </div>

        <div className="footer-col">
          <h4>Torneos</h4>
          <NavLink to="/torneos">Ver torneos</NavLink>
          <NavLink to="/resultados">Resultados</NavLink>
          <NavLink to="/reglas">Cómo funciona</NavLink>
          <NavLink to="/campeones">Campeones</NavLink>
        </div>

        <div className="footer-col">
          <h4>La sede</h4>
          <NavLink to="/reservar">Reservar cancha</NavLink>
          <NavLink to="/precios">Precios y horarios</NavLink>
          <NavLink to="/la-sede">Servicios y galería</NavLink>
          <NavLink to="/ranking">Ranking</NavLink>
        </div>

        <div className="footer-col">
          <h4>Contacto</h4>
          <div className="footer-contact-item">
            <Mail size={16} />
            <span>{configuracion.email}</span>
          </div>
          <div className="footer-contact-item">
            <MapPin size={16} />
            <span>{configuracion.direccion}</span>
          </div>
          <div className="footer-contact-item">
            <Phone size={16} />
            <span>{configuracion.telefono}</span>
          </div>
          <div className="footer-legal-links mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs">
            <NavLink to="/contacto">Contacto</NavLink>
            <NavLink to="/terminos">Términos</NavLink>
            <NavLink to="/privacidad">Privacidad</NavLink>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        &copy; {CURRENT_YEAR} {brand.name} - Todos los derechos reservados.
      </div>
    </footer>
  )
})
