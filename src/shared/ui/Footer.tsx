import { Camera, Mail, MapPin, MessageCircle, Phone, Send } from 'lucide-react'
import { memo } from 'react'
import { NavLink } from 'react-router-dom'

const CURRENT_YEAR = new Date().getFullYear()

export const Footer = memo(function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <div className="footer-brand">
          <div className="footer-logo-row">
            <span className="footer-logo-icon" aria-hidden="true" />
            <div>
              <div className="footer-logo-text">RankPadel</div>
              <div className="footer-logo-sub">Santiago del Estero</div>
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
            <span>info@rankpadel.com</span>
          </div>
          <div className="footer-contact-item">
            <MapPin size={16} />
            <span>Santiago del Estero, Argentina</span>
          </div>
          <div className="footer-contact-item">
            <Phone size={16} />
            <span>+54 9 385 123-4567</span>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        &copy; {CURRENT_YEAR} RankPadel - Todos los derechos reservados.
      </div>
    </footer>
  )
})
