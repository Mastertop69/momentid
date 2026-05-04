'use client'

import { useState, useRef } from 'react'
import { useParams } from 'next/navigation'

type Step = 'identify' | 'upload' | 'success'
type PhotoStatus = 'pending' | 'uploading' | 'done' | 'error'

interface PhotoItem {
  file: File
  preview: string
  status: PhotoStatus
}

// ── Compresión de imagen en el navegador ──────────────────────────────────────
async function comprimirFoto(file: File): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const MAX = 1800
      let { width, height } = img
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round(height * MAX / width); width = MAX }
        else { width = Math.round(width * MAX / height); height = MAX }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return }
          resolve(new File([blob], file.name, { type: 'image/jpeg' }))
        },
        'image/jpeg',
        0.85
      )
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
    img.src = url
  })
}

export default function SubirFotosPage() {
  const params = useParams()
  const slug = params.slug as string

  const [step, setStep] = useState<Step>('identify')
  const [identifier, setIdentifier] = useState('')
  const [guestId, setGuestId] = useState('')
  const [guestName, setGuestName] = useState('')
  const [photos, setPhotos] = useState<PhotoItem[]>([])
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [uploadResult, setUploadResult] = useState<{ exitosas: number; total: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleIdentify(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')
    try {
      const res = await fetch('/api/identify-guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, eventSlug: slug }),
      })
      const data = await res.json()
      if (!res.ok) { setErrorMsg(data.error || 'No encontramos tu registro.'); return }
      setGuestId(data.guestId)
      setGuestName(data.guestName)
      setStep('upload')
    } catch {
      setErrorMsg('Error de conexión. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const nuevas = Array.from(e.target.files || [])
    if (photos.length + nuevas.length > 20) {
      setErrorMsg(`Podés subir máximo 20 fotos en total. Ya tenés ${photos.length}.`)
      return
    }
    const sobreMaximo = nuevas.filter(f => f.size > 15 * 1024 * 1024)
    if (sobreMaximo.length > 0) {
      setErrorMsg(`${sobreMaximo.length} foto(s) superan los 15MB y no se agregarán.`)
    } else {
      setErrorMsg('')
    }
    const validas = nuevas.filter(f => f.size <= 15 * 1024 * 1024)
    const nuevosItems: PhotoItem[] = validas.map(f => ({
      file: f,
      preview: URL.createObjectURL(f),
      status: 'pending',
    }))
    setPhotos(prev => [...prev, ...nuevosItems])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function removePhoto(index: number) {
    setPhotos(prev => {
      URL.revokeObjectURL(prev[index].preview)
      return prev.filter((_, i) => i !== index)
    })
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (photos.length === 0) { setErrorMsg('Seleccioná al menos una foto.'); return }

    setLoading(true)
    setErrorMsg('')
    setProgress({ current: 0, total: photos.length })

    let exitosas = 0

    for (let i = 0; i < photos.length; i++) {
      setPhotos(prev => prev.map((p, idx) => idx === i ? { ...p, status: 'uploading' } : p))
      setProgress({ current: i + 1, total: photos.length })

      try {
        // Comprimir antes de subir
        const fotoComprimida = await comprimirFoto(photos[i].file)

        const formData = new FormData()
        formData.append('eventSlug', slug)
        formData.append('guestId', guestId)
        formData.append('photos', fotoComprimida)

        const res = await fetch('/api/upload-event-photos', {
          method: 'POST',
          body: formData,
        })
        const data = await res.json()
        const ok = res.ok && data.results?.[0]?.success

        setPhotos(prev => prev.map((p, idx) => idx === i ? { ...p, status: ok ? 'done' : 'error' } : p))
        if (ok) exitosas++
      } catch {
        setPhotos(prev => prev.map((p, idx) => idx === i ? { ...p, status: 'error' } : p))
      }
    }

    setUploadResult({ exitosas, total: photos.length })
    setStep('success')
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-start px-4 py-10">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">📸 Subí tus fotos</h1>
          <p className="text-gray-400 text-sm">
            Compartí tus fotos y las distribuimos automáticamente
          </p>
        </div>

        {step === 'identify' && (
          <form onSubmit={handleIdentify} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Tu teléfono o email con el que te registraste
              </label>
              <input
                type="text"
                inputMode="email"
                autoComplete="email"
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                placeholder="Ej: 1134567890 o vos@email.com"
                required
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-4 text-white text-lg placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            {errorMsg && <p className="text-red-400 text-sm text-center">{errorMsg}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-gray-600 text-white font-semibold py-4 text-lg rounded-xl transition"
            >
              {loading ? 'Verificando...' : 'Continuar →'}
            </button>
          </form>
        )}

        {step === 'upload' && (
          <form onSubmit={handleUpload} className="space-y-5">
            <p className="text-center text-green-400 font-medium text-lg">
              ¡Hola, {guestName}! 👋
            </p>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading || photos.length >= 20}
              className="w-full border-2 border-dashed border-gray-600 hover:border-blue-500 active:border-blue-400 disabled:opacity-40 rounded-2xl py-10 text-center transition"
            >
              <p className="text-5xl mb-3">📷</p>
              <p className="text-white font-semibold text-lg">
                {photos.length === 0 ? 'Elegí tus fotos' : 'Agregar más fotos'}
              </p>
              <p className="text-gray-400 text-sm mt-1">
                Galería o cámara · hasta 20 fotos · máx 15MB c/u
              </p>
              {photos.length > 0 && (
                <p className="text-blue-400 text-sm mt-2 font-medium">
                  {photos.length} / 20 seleccionadas
                </p>
              )}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />

            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {photos.map((item, i) => (
                  <div key={i} className="relative aspect-square">
                    <img
                      src={item.preview}
                      alt={`foto ${i + 1}`}
                      className={`w-full h-full object-cover rounded-xl transition ${
                        item.status === 'uploading' ? 'opacity-50' : 'opacity-100'
                      }`}
                    />
                    {item.status === 'uploading' && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black bg-opacity-40">
                        <span className="text-2xl animate-spin">⏳</span>
                      </div>
                    )}
                    {item.status === 'done' && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-green-900 bg-opacity-50">
                        <span className="text-3xl">✅</span>
                      </div>
                    )}
                    {item.status === 'error' && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-red-900 bg-opacity-75 px-1">
                        <span className="text-2xl">❌</span>
                        <p className="text-white text-xs text-center mt-1 leading-tight break-all">
                          {item.file.name.length > 20
                            ? item.file.name.slice(0, 18) + '...'
                            : item.file.name}
                        </p>
                      </div>
                    )}
                    {item.status === 'pending' && !loading && (
                      <button
                        type="button"
                        onClick={() => removePhoto(i)}
                        className="absolute top-1 right-1 bg-black bg-opacity-70 rounded-full w-7 h-7 flex items-center justify-center text-sm hover:bg-red-600 active:bg-red-700 transition"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {loading && progress.total > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-400">
                  <span>Subiendo foto {progress.current} de {progress.total}...</span>
                  <span>{Math.round((progress.current / progress.total) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-3">
                  <div
                    className="bg-blue-500 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {errorMsg && <p className="text-red-400 text-sm text-center">{errorMsg}</p>}

            <button
              type="submit"
              disabled={loading || photos.length === 0}
              className="w-full bg-green-600 hover:bg-green-700 active:bg-green-800 disabled:bg-gray-600 text-white font-semibold py-4 text-lg rounded-xl transition"
            >
              {loading
                ? `Subiendo ${progress.current} de ${progress.total}...`
                : `Subir ${photos.length} foto${photos.length !== 1 ? 's' : ''} →`}
            </button>
          </form>
        )}

        {step === 'success' && uploadResult && (
          <div className="text-center space-y-5">
            <p className="text-7xl">🎉</p>
            <h2 className="text-2xl font-bold">¡Gracias!</h2>
            <div className="bg-gray-800 rounded-2xl p-5 space-y-2">
              <p className="text-green-400 font-semibold text-lg">
                ✅ {uploadResult.exitosas} foto{uploadResult.exitosas !== 1 ? 's' : ''} subida{uploadResult.exitosas !== 1 ? 's' : ''} correctamente
              </p>
              {uploadResult.total - uploadResult.exitosas > 0 && (
                <p className="text-red-400 text-sm">
                  ❌ {uploadResult.total - uploadResult.exitosas} foto(s) no se pudieron subir
                </p>
              )}
              <p className="text-gray-400 text-sm pt-1">
                Las distribuimos automáticamente a cada persona que aparece en tus fotos.
              </p>
            </div>
            <button
              onClick={() => {
                setPhotos([])
                setProgress({ current: 0, total: 0 })
                setUploadResult(null)
                setStep('upload')
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-4 text-lg rounded-xl transition"
            >
              📷 Subir más fotos
            </button>
          </div>
        )}

      </div>
    </main>
  )
}