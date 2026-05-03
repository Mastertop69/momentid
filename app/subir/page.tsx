'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'

type Step = 'identify' | 'upload' | 'success' | 'error'

export default function SubirFotosPage() {
  const params = useParams()
  const slug = params.slug as string

  const [step, setStep] = useState<Step>('identify')
  const [identifier, setIdentifier] = useState('')
  const [guestId, setGuestId] = useState('')
  const [guestName, setGuestName] = useState('')
  const [photos, setPhotos] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [uploadResult, setUploadResult] = useState<{ exitosas: number; total: number } | null>(null)

  // Paso 1: identificar al invitado por teléfono o email
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

      if (!res.ok) {
        setErrorMsg(data.error || 'No encontramos tu registro.')
        setLoading(false)
        return
      }

      setGuestId(data.guestId)
      setGuestName(data.guestName)
      setStep('upload')
    } catch {
      setErrorMsg('Error de conexión. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  // Paso 2: seleccionar fotos
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (files.length > 20) {
      setErrorMsg('Máximo 20 fotos por vez.')
      return
    }
    setErrorMsg('')
    setPhotos(files)
    setPreviews(files.map(f => URL.createObjectURL(f)))
  }

  function removePhoto(index: number) {
    setPhotos(prev => prev.filter((_, i) => i !== index))
    setPreviews(prev => prev.filter((_, i) => i !== index))
  }

  // Paso 3: subir fotos
  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (photos.length === 0) {
      setErrorMsg('Seleccioná al menos una foto.')
      return
    }

    setLoading(true)
    setErrorMsg('')

    try {
      const formData = new FormData()
      formData.append('eventSlug', slug)
      formData.append('guestId', guestId)
      photos.forEach(photo => formData.append('photos', photo))

      const res = await fetch('/api/upload-event-photos', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        setErrorMsg(data.error || 'Error al subir las fotos.')
        setLoading(false)
        return
      }

      const exitosas = data.results.filter((r: any) => r.success).length
      setUploadResult({ exitosas, total: photos.length })
      setStep('success')
    } catch {
      setErrorMsg('Error de conexión. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">📸 Subí tus fotos</h1>
          <p className="text-gray-400 text-sm">
            Compartí tus fotos del evento y las distribuimos automáticamente
          </p>
        </div>

        {/* STEP: identify */}
        {step === 'identify' && (
          <form onSubmit={handleIdentify} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Tu teléfono o email con el que te registraste
              </label>
              <input
                type="text"
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                placeholder="Ej: 1134567890 o vos@email.com"
                required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            {errorMsg && (
              <p className="text-red-400 text-sm text-center">{errorMsg}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-semibold py-3 rounded-lg transition"
            >
              {loading ? 'Verificando...' : 'Continuar →'}
            </button>
          </form>
        )}

        {/* STEP: upload */}
        {step === 'upload' && (
          <form onSubmit={handleUpload} className="space-y-5">
            <p className="text-center text-green-400 font-medium">
              ¡Hola, {guestName}! 👋
            </p>
            <p className="text-center text-gray-400 text-sm">
              Seleccioná hasta 20 fotos del evento
            </p>

            {/* Selector de fotos */}
            <label className="block w-full cursor-pointer">
              <div className="border-2 border-dashed border-gray-600 hover:border-blue-500 rounded-xl p-8 text-center transition">
                <p className="text-4xl mb-2">📷</p>
                <p className="text-gray-400 text-sm">Tocá para seleccionar fotos</p>
                <p className="text-gray-600 text-xs mt-1">JPG, PNG — máx 15MB por foto</p>
              </div>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
            </label>

            {/* Previews */}
            {previews.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {previews.map((src, i) => (
                  <div key={i} className="relative aspect-square">
                    <img
                      src={src}
                      alt={`foto ${i + 1}`}
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      className="absolute top-1 right-1 bg-black bg-opacity-60 rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {photos.length > 0 && (
              <p className="text-center text-gray-400 text-sm">
                {photos.length} foto{photos.length !== 1 ? 's' : ''} seleccionada{photos.length !== 1 ? 's' : ''}
              </p>
            )}

            {errorMsg && (
              <p className="text-red-400 text-sm text-center">{errorMsg}</p>
            )}

            <button
              type="submit"
              disabled={loading || photos.length === 0}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-semibold py-3 rounded-lg transition"
            >
              {loading ? 'Subiendo fotos...' : `Subir ${photos.length > 0 ? photos.length : ''} foto${photos.length !== 1 ? 's' : ''} →`}
            </button>
          </form>
        )}

        {/* STEP: success */}
        {step === 'success' && uploadResult && (
          <div className="text-center space-y-4">
            <p className="text-6xl">🎉</p>
            <h2 className="text-2xl font-bold">¡Gracias!</h2>
            <p className="text-gray-300">
              Subiste {uploadResult.exitosas} de {uploadResult.total} fotos correctamente.
            </p>
            <p className="text-gray-500 text-sm">
              Las distribuimos automáticamente a cada persona que aparece en tus fotos.
            </p>
            <button
              onClick={() => {
                setPhotos([])
                setPreviews([])
                setStep('upload')
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition"
            >
              Subir más fotos
            </button>
          </div>
        )}

      </div>
    </main>
  )
}
