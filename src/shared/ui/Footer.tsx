import { Camera, Mail, MapPin, MessageCircle, Phone, Send } from 'lucide-react'
import { memo } from 'react'
import { NavLink } from 'react-router-dom'

import { brand } from '@/config/brand'

const CURRENT_YEAR = new Date().getFullYear()

export const Footer = memo(function Footer() {
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
            <a href="#" className="fsoc" aria-label="Instagram">
              <Camera size={18} />
            </a>
            <a href="#" className="fsoc" aria-label="Facebook">
              <MessageCircle size={18} />
            </a>
            <a href="#" className="fsoc" aria-label="WhatsApp">
              <Send size={18} />
            </a>
          </div>
        </div>

        <div className="footer-col">
          <h4>Torneos</h4>
          <NavLink to="/torneos">Ver torneos</NavLink>
          <NavLink to="/torneos">Calendario</NavLink>
          <NavLink to="/torneos">Resultados</NavLink>
        </div>

        <div className="footer-col">
          <h4>Comunidad</h4>
          <NavLink to="/ranking">Ranking</NavLink>
          <NavLink to="/">Jugadores</NavLink>
          <NavLink to="/">Noticias</NavLink>
        </div>

        <div className="footer-col">
          <h4>Contacto</h4>
          <div className="footer-contact-item">
            <Mail size={16} />
            <span>{brand.email}</span>
          </div>
          <div className="footer-contact-item">
            <MapPin size={16} />
            <span>{brand.location}, {brand.country}</span>
          </div>
          <div className="footer-contact-item">
            <Phone size={16} />
            <span>{brand.phone}</span>
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
