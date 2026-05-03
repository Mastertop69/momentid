'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'

interface Photo {
  id: string
  url: string
  similarity: number
  takenAt: string
}

type Status = 'loading' | 'matching' | 'success' | 'empty' | 'error'

export default function GaleriaPage() {
  const params = useParams()
  const token = params.token as string

  const [status, setStatus] = useState<Status>('loading')
  const [photos, setPhotos] = useState<Photo[]>([])
  const [guestName, setGuestName] = useState('')
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!token) return
    fetchPhotos()
  }, [token])

  async function fetchPhotos() {
    try {
      setStatus('matching')

      const res = await fetch('/api/match-faces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ galleryToken: token }),
      })

      const data = await res.json()

      if (!res.ok) {
        setErrorMsg(data.error || 'Error al buscar tus fotos')
        setStatus('error')
        return
      }

      setGuestName(data.guestName || '')

      if (data.matchesFound === 0) {
        setStatus('empty')
        return
      }

      setPhotos(data.photos)
      setStatus('success')
    } catch (err) {
      setErrorMsg('Error de conexión. Intentá de nuevo.')
      setStatus('error')
    }
  }

  async function downloadPhoto(photo: Photo) {
    const res = await fetch(photo.url)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `momentid-foto-${photo.id}.jpg`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Estados de carga y matching
  if (status === 'loading' || status === 'matching') {
    return (
      <main className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-4">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#e8ff5a] border-t-transparent rounded-full animate-spin mx-auto mb-6" />
          <p className="text-white text-lg font-medium">
            {status === 'loading' ? 'Cargando tu galería...' : '🔍 Buscando tus fotos con IA...'}
          </p>
          {status === 'matching' && (
            <p className="text-white/40 text-sm mt-2">Esto puede tardar unos segundos</p>
          )}
        </div>
      </main>
    )
  }

  // Error
  if (status === 'error') {
    return (
      <main className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">😕</div>
          <h1 className="text-white text-xl font-bold mb-2">Algo salió mal</h1>
          <p className="text-white/50 text-sm mb-6">{errorMsg}</p>
          <button
            onClick={fetchPhotos}
            className="bg-[#e8ff5a] text-black font-bold px-6 py-3 rounded-full"
          >
            Intentar de nuevo
          </button>
        </div>
      </main>
    )
  }

  // Sin fotos
  if (status === 'empty') {
    return (
      <main className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">📸</div>
          <h1 className="text-white text-xl font-bold mb-2">
            Aún no hay fotos tuyas
          </h1>
          <p className="text-white/50 text-sm mb-6">
            El fotógrafo todavía no subió las fotos del evento. Volvé más tarde.
          </p>
          <button
            onClick={fetchPhotos}
            className="bg-white/10 text-white font-medium px-6 py-3 rounded-full border border-white/10"
          >
            Revisar de nuevo
          </button>
        </div>
      </main>
    )
  }

  // Galería con fotos
  return (
    <main className="min-h-screen bg-[#0a0a0a] px-4 py-8">
      {/* Header */}
      <div className="max-w-2xl mx-auto mb-8">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[#e8ff5a] text-xs font-bold tracking-widest uppercase">MomentID</span>
        </div>
        <h1 className="text-white text-2xl font-bold">
          {guestName ? `Hola, ${guestName} 👋` : 'Tu galería privada'}
        </h1>
        <p className="text-white/40 text-sm mt-1">
          Encontramos {photos.length} foto{photos.length !== 1 ? 's' : ''} donde aparecés
        </p>
      </div>

      {/* Grid de fotos */}
      <div className="max-w-2xl mx-auto grid grid-cols-2 gap-3 sm:grid-cols-3">
        {photos.map((photo) => (
          <div
            key={photo.id}
            onClick={() => setSelectedPhoto(photo)}
            className="relative aspect-square rounded-2xl overflow-hidden cursor-pointer group bg-white/5"
          >
            <img
              src={photo.url}
              alt="Tu foto"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all" />
            <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
              {Math.round(photo.similarity)}% match
            </div>
          </div>
        ))}
      </div>

      {/* Modal de foto ampliada */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div
            className="relative max-w-lg w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedPhoto.url}
              alt="Foto ampliada"
              className="w-full rounded-2xl"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => downloadPhoto(selectedPhoto)}
                className="flex-1 bg-[#e8ff5a] text-black font-bold py-3 rounded-full text-sm"
              >
                ⬇️ Descargar foto
              </button>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="bg-white/10 text-white font-medium py-3 px-5 rounded-full text-sm border border-white/10"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}