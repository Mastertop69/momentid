export default function Home() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">

      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-[#0a0a0a]/80 backdrop-blur border-b border-white/5">
        <span className="text-lg font-bold text-white">
          Moment<span className="text-[#e8ff5a]">ID</span>
        </span>
        <a href="#contacto" className="px-4 py-2 rounded-full border border-white/20 text-sm text-white/80 hover:bg-white hover:text-black transition-all">
          Pedir demo
        </a>
      </nav>

      {/* HERO */}
      <section className="flex flex-col items-center justify-center min-h-screen px-6 pt-24 pb-16 text-center">
        <span className="inline-block px-3 py-1 mb-6 rounded-full border border-[#e8ff5a]/30 bg-[#e8ff5a]/10 text-[#e8ff5a] text-xs font-medium tracking-widest uppercase">
          Reconocimiento facial para eventos
        </span>
        <h1 className="text-5xl sm:text-7xl font-extrabold leading-tight tracking-tight mb-6">
          Tus fotos del evento,{" "}
          <span className="text-[#e8ff5a]">directo a tu celular</span>
        </h1>
        <p className="text-lg text-white/50 max-w-2xl mx-auto mb-10">
          Escaneás el QR, subís una selfie y listo. Nuestro sistema encuentra todas las fotos donde aparecés y te las envía automáticamente.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <a href="#contacto" className="px-8 py-4 rounded-full bg-[#e8ff5a] text-black font-bold hover:bg-white transition-all">
            Solicitar demo
          </a>
          <a href="#como-funciona" className="px-8 py-4 rounded-full border border-white/15 text-white/70 hover:border-white/40 hover:text-white transition-all">
            Cómo funciona
          </a>
        </div>
      </section>

      {/* CÓMO FUNCIONA */}
      <section id="como-funciona" className="py-24 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16">Tres pasos, sin fricción</h2>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              { num: "01", title: "Escaneás el QR", desc: "El QR único de tu evento te lleva directo al registro. Sin apps, sin descargas." },
              { num: "02", title: "Subís una selfie", desc: "Completás tu nombre, teléfono y una selfie clara. Todo en menos de 30 segundos." },
              { num: "03", title: "Recibís tus fotos", desc: "Al día siguiente recibís un link con todas las fotos del evento donde aparecés." },
            ].map((step) => (
              <div key={step.num} className="p-6 rounded-2xl border border-white/8 bg-white/3">
                <span className="text-5xl font-black text-[#e8ff5a]/20 block mb-4">{step.num}</span>
                <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TIPOS DE EVENTOS */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-16">Ideal para cualquier evento</h2>
          <div className="flex flex-wrap justify-center gap-3">
            {["💍 Casamientos", "🎉 Fiestas de 15", "🏢 Eventos corporativos", "🎓 Graduaciones", "🎤 Congresos", "🎊 Cumpleaños"].map((ev) => (
              <span key={ev} className="px-5 py-2.5 rounded-full border border-white/10 bg-white/4 text-white/70 text-sm">
                {ev}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CONTACTO */}
      <section id="contacto" className="py-24 px-6 border-t border-white/5">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">¿Tenés un evento?</h2>
          <p className="text-white/50 mb-10">Contanos qué necesitás y te armamos una demo en 24 horas.</p>
          <div className="flex flex-col gap-4 text-left">
            <input type="text" placeholder="Tu nombre" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-[#e8ff5a]/40 text-sm" />
            <input type="email" placeholder="tu@email.com" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-[#e8ff5a]/40 text-sm" />
            <input type="text" placeholder="Tipo de evento (casamiento, corporativo...)" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-[#e8ff5a]/40 text-sm" />
            <button className="w-full py-4 rounded-full bg-[#e8ff5a] text-black font-bold hover:bg-white transition-all mt-2">
              Solicitar demo gratis
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-8 px-6 border-t border-white/5 text-center text-white/20 text-xs">
        © 2026 MomentID · Todos los derechos reservados
      </footer>

    </main>
  );
}