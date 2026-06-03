import { brand } from '@/config/brand'

export default function TerminosPage() {
    return (
        <section className="mx-auto max-w-2xl px-4 py-16">
            <h1 className="text-3xl font-black text-rp-text">Términos y condiciones</h1>
            <p className="mt-2 text-xs text-rp-muted">Última actualización: (completar)</p>

            {/* PLACEHOLDER: reemplazar por el texto legal real revisado por un profesional. */}
            <div className="mt-6 flex flex-col gap-4 text-sm leading-relaxed text-rp-muted">
                <p>
                    Bienvenido a {brand.name}. Al utilizar este sitio aceptás los presentes términos
                    y condiciones. Este es un texto de ejemplo que debés reemplazar por tus términos
                    definitivos.
                </p>
                <h2 className="text-lg font-bold text-rp-text">1. Uso del sitio</h2>
                <p>
                    El contenido (rankings, torneos, resultados) tiene fines informativos sobre la
                    actividad deportiva organizada por {brand.name} en {brand.location}.
                </p>
                <h2 className="text-lg font-bold text-rp-text">2. Datos de los jugadores</h2>
                <p>
                    Los nombres y estadísticas publicados corresponden a participantes de los torneos.
                    Para solicitudes de corrección o baja, escribinos a {brand.email}.
                </p>
                <h2 className="text-lg font-bold text-rp-text">3. Responsabilidad</h2>
                <p>
                    {brand.name} procura mantener la información actualizada, pero no garantiza la
                    ausencia de errores. (Completar con el texto legal definitivo.)
                </p>
            </div>
        </section>
    )
}
