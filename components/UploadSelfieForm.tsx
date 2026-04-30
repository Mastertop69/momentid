"use client";

import { useState, useRef, ChangeEvent } from "react";

interface Props {
  eventId: string;
  eventName: string;
}

type Step = "form" | "uploading" | "success" | "error";

export default function UploadSelfieForm({ eventId, eventName }: Props) {
  const [step, setStep] = useState<Step>("form");
  const [errorMsg, setErrorMsg] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleSelfieChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setFieldErrors((prev) => ({ ...prev, selfie: "Solo se aceptan imágenes." }));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setFieldErrors((prev) => ({ ...prev, selfie: "La imagen no puede superar 10 MB." }));
      return;
    }
    setSelfieFile(file);
    setFieldErrors((prev) => ({ ...prev, selfie: "" }));
    const reader = new FileReader();
    reader.onload = (ev) => setSelfiePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = "El nombre es obligatorio.";
    if (!phone.trim()) errors.phone = "El teléfono es obligatorio.";
    if (!selfieFile) errors.selfie = "Necesitamos una selfie tuya.";
    if (!consent) errors.consent = "Debés aceptar los términos para continuar.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setStep("uploading");
    try {
      const formData = new FormData();
      formData.append("eventId", eventId);
      formData.append("name", name.trim());
      formData.append("phone", phone.trim());
      formData.append("email", email.trim());
      formData.append("consent", String(consent));
      formData.append("selfie", selfieFile!);
      const res = await fetch("/api/guests/create", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al registrarte.");
      setStep("success");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error inesperado.");
      setStep("error");
    }
  }

  if (step === "success") {
    return (
      <div className="text-center py-8">
        <span className="text-6xl block mb-6">🎉</span>
        <h2 className="text-2xl font-bold mb-3">¡Listo!</h2>
        <p className="text-white/60 text-sm leading-relaxed">
          Ya registramos tu selfie para{" "}
          <strong className="text-white">{eventName}</strong>.<br />
          Mañana recibís el link con todas tus fotos.
        </p>
      </div>
    );
  }

  if (step === "error") {
    return (
      <div className="text-center py-8">
        <span className="text-5xl block mb-6">😕</span>
        <h2 className="text-xl font-bold mb-3">Algo salió mal</h2>
        <p className="text-white/50 text-sm mb-6">{errorMsg}</p>
        <button
          onClick={() => setStep("form")}
          className="px-6 py-3 rounded-full bg-[#e8ff5a] text-black font-bold text-sm"
        >
          Intentar de nuevo
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <label className="block text-xs text-white/40 mb-1.5 uppercase tracking-widest">
          Nombre completo *
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Juan García"
          className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none text-sm ${
            fieldErrors.name ? "border-red-500/60" : "border-white/10 focus:border-[#e8ff5a]/40"
          }`}
        />
        {fieldErrors.name && <p className="text-red-400 text-xs mt-1">{fieldErrors.name}</p>}
      </div>

      <div>
        <label className="block text-xs text-white/40 mb-1.5 uppercase tracking-widest">
          Teléfono / WhatsApp *
        </label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+54 9 11 1234 5678"
          className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none text-sm ${
            fieldErrors.phone ? "border-red-500/60" : "border-white/10 focus:border-[#e8ff5a]/40"
          }`}
        />
        {fieldErrors.phone && <p className="text-red-400 text-xs mt-1">{fieldErrors.phone}</p>}
      </div>

      <div>
        <label className="block text-xs text-white/40 mb-1.5 uppercase tracking-widest">
          Email <span className="normal-case text-white/20">(opcional)</span>
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@email.com"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-[#e8ff5a]/40 text-sm"
        />
      </div>

      <div>
        <label className="block text-xs text-white/40 mb-1.5 uppercase tracking-widest">
          Tu selfie *
        </label>
        {selfiePreview ? (
          <div className="relative">
            <img
              src={selfiePreview}
              alt="Preview"
              className="w-full max-h-64 object-cover rounded-xl border border-white/10"
            />
            <button
              onClick={() => { setSelfieFile(null); setSelfiePreview(null); }}
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/70 text-white text-xs flex items-center justify-center"
            >
              X
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            className={`w-full border-2 border-dashed rounded-xl p-8 text-center transition-all ${
              fieldErrors.selfie ? "border-red-500/60" : "border-white/15 hover:border-[#e8ff5a]/40"
            }`}
          >
            <span className="text-3xl block mb-2">🤳</span>
            <span className="text-white/50 text-sm block">Tocá para subir tu selfie</span>
            <span className="text-white/25 text-xs block mt-1">Cara visible · Buena luz · Sin anteojos oscuros</span>
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="user"
          className="hidden"
          onChange={handleSelfieChange}
        />
        {fieldErrors.selfie && <p className="text-red-400 text-xs mt-1">{fieldErrors.selfie}</p>}
      </div>

      <div>
        <div className="flex items-start gap-3">
          <div
            onClick={() => setConsent(!consent)}
            className={`w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 flex-shrink-0 cursor-pointer ${
              consent ? "bg-[#e8ff5a] border-[#e8ff5a]" : "border-white/20"
            }`}
          >
            {consent && <span className="text-black text-xs font-bold">✓</span>}
          </div>
          <span className="text-xs text-white/40 leading-relaxed">
            Acepto que mis datos sean procesados para encontrar mis fotos
            mediante reconocimiento facial. Los datos se eliminan a los 60 días del evento.
          </span>
        </div>
        {fieldErrors.consent && <p className="text-red-400 text-xs mt-2">{fieldErrors.consent}</p>}
      </div>

      <button
        onClick={handleSubmit}
        disabled={step === "uploading"}
        className="w-full py-4 rounded-full bg-[#e8ff5a] text-black font-bold text-base hover:bg-white transition-all disabled:opacity-50 mt-2"
      >
        {step === "uploading" ? "Subiendo selfie..." : "Registrarme al evento →"}
      </button>

      <p className="text-center text-white/20 text-xs">
        Solo tarda 30 segundos · Sin crear cuenta
      </p>
    </div>
  );
}