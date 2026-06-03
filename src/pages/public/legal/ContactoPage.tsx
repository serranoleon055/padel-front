import { Mail, MapPin, Phone } from 'lucide-react'

import { brand } from '@/config/brand'

export default function ContactoPage() {
    return (
        <section className="mx-auto max-w-2xl px-4 py-16">
            <h1 className="text-3xl font-black text-rp-text">Contacto</h1>
            <p className="mt-3 text-rp-muted">
                ¿Tenés una consulta sobre torneos, inscripciones o el ranking? Escribinos.
            </p>

            <div className="mt-8 flex flex-col gap-4">
                <a href={`mailto:${brand.email}`} className="flex items-center gap-3 rounded-lg border border-rp-border bg-rp-surface/82 p-4 hover:border-rp-accent">
                    <Mail size={18} className="text-rp-accent" />
                    <span className="text-rp-text">{brand.email}</span>
                </a>
                <div className="flex items-center gap-3 rounded-lg border border-rp-border bg-rp-surface/82 p-4">
                    <Phone size={18} className="text-rp-accent" />
                    <span className="text-rp-text">{brand.phone}</span>
                </div>
                <div className="flex items-center gap-3 rounded-lg border border-rp-border bg-rp-surface/82 p-4">
                    <MapPin size={18} className="text-rp-accent" />
                    <span className="text-rp-text">{brand.location}, {brand.country}</span>
                </div>
            </div>
        </section>
    )
}
