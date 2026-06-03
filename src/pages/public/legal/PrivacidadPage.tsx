import { brand } from '@/config/brand'

export default function PrivacidadPage() {
    return (
        <section className="mx-auto max-w-2xl px-4 py-16">
            <h1 className="text-3xl font-black text-rp-text">Política de privacidad</h1>
            <p className="mt-2 text-xs text-rp-muted">Última actualización: (completar)</p>

            {/* PLACEHOLDER: reemplazar por la política real revisada por un profesional. */}
            <div className="mt-6 flex flex-col gap-4 text-sm leading-relaxed text-rp-muted">
                <p>
                    En {brand.name} respetamos tu privacidad. Este es un texto de ejemplo que debés
                    reemplazar por tu política de privacidad definitiva, acorde a la normativa aplicable
                    (en Argentina, la Ley 25.326 de Protección de Datos Personales).
                </p>
                <h2 className="text-lg font-bold text-rp-text">1. Datos que recopilamos</h2>
                <p>
                    Datos de jugadores necesarios para la organización deportiva (nombre, categoría,
                    resultados) y datos técnicos de navegación.
                </p>
                <h2 className="text-lg font-bold text-rp-text">2. Uso de los datos</h2>
                <p>
                    Se utilizan exclusivamente para gestionar torneos y publicar el ranking. No se
                    venden a terceros.
                </p>
                <h2 className="text-lg font-bold text-rp-text">3. Tus derechos</h2>
                <p>
                    Podés solicitar acceso, rectificación o eliminación de tus datos escribiendo a {brand.email}.
                </p>
            </div>
        </section>
    )
}
