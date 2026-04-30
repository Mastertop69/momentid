import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase";
import UploadSelfieForm from "@/components/UploadSelfieForm";

interface Props {
  params: Promise<{ slug: string }>;
}

async function getEvent(slug: string) {
  const { data, error } = await supabaseAdmin
    .from("events")
    .select("*")
    .eq("slug", slug)
    .eq("status", "active")
    .single();

  if (error || !data) return null;
  return data;
}

export default async function EventPage({ params }: Props) {
  const { slug } = await params;
  const event = await getEvent(slug);

  if (!event) {
    notFound();
  }

  if (!event.selfie_upload_enabled) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <span className="text-5xl block mb-6">🔒</span>
          <h1 className="text-2xl font-bold mb-3">Registro cerrado</h1>
          <p className="text-white/50">
            El registro para <strong>{event.name}</strong> ya no está disponible.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <header className="px-6 pt-12 pb-8 text-center border-b border-white/5">
        <span className="inline-block px-3 py-1 mb-4 rounded-full border border-[#e8ff5a]/30 bg-[#e8ff5a]/10 text-[#e8ff5a] text-xs font-medium tracking-widest uppercase">
          {new Date(event.date).toLocaleDateString("es-AR", {
            day: "numeric", month: "long", year: "numeric",
          })}
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2">
          {event.name}
        </h1>
        {event.venue && (
          <p className="text-white/40 text-sm">📍 {event.venue}</p>
        )}
      </header>

      <section className="max-w-md mx-auto px-6 py-8">
        <div className="flex flex-col gap-3 mb-8">
          {[
            { icon: "📸", text: "Subí una selfie clara con tu cara" },
            { icon: "✅", text: "Completá tu nombre y teléfono" },
            { icon: "🎉", text: "Recibís tus fotos del evento automáticamente" },
          ].map((item) => (
            <div key={item.text} className="flex items-center gap-3 p-3 rounded-xl bg-white/3 border border-white/5">
              <span className="text-xl">{item.icon}</span>
              <span className="text-sm text-white/70">{item.text}</span>
            </div>
          ))}
        </div>
        <UploadSelfieForm eventId={event.id} eventName={event.name} />
      </section>
    </main>
  );
}
