import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { searchFacesByImage } from '@/lib/rekognition'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { galleryToken } = await request.json()

    if (!galleryToken) {
      return NextResponse.json({ error: 'Falta gallery_token' }, { status: 400 })
    }

    const { data: guest, error: guestError } = await supabase
      .from('guests')
      .select('*, events(slug)')
      .eq('gallery_token', galleryToken)
      .single()

    if (guestError || !guest) {
      return NextResponse.json({ error: 'Invitado no encontrado' }, { status: 404 })
    }

    const eventSlug = guest.events?.slug
    if (!eventSlug) {
      return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 })
    }

    const { data: selfieFile, error: selfieError } = await supabase.storage
      .from('selfies')
      .download(guest.selfie_path)

    if (selfieError || !selfieFile) {
      return NextResponse.json({ error: 'Selfie no encontrada' }, { status: 404 })
    }

    const arrayBuffer = await selfieFile.arrayBuffer()
    const selfieBytes = new Uint8Array(arrayBuffer)

    const matches = await searchFacesByImage(eventSlug, selfieBytes)

    if (matches.length === 0) {
      return NextResponse.json({ success: true, matchesFound: 0, photos: [] })
    }

    const photoIds = [...new Set(matches.map((m) => m.photoId))]

    const { data: photos, error: photosError } = await supabase
      .from('event_photos')
      .select('*')
      .in('id', photoIds)

    if (photosError) throw photosError

    const photosWithUrls = await Promise.all(
      (photos || []).map(async (photo) => {
        const { data: urlData } = await supabase.storage
          .from('event-photos')
          .createSignedUrl(photo.storage_path, 3600)

        const match = matches.find((m) => m.photoId === photo.id)

        return {
          id: photo.id,
          url: urlData?.signedUrl || '',
          similarity: match?.similarity || 0,
          takenAt: photo.taken_at,
        }
      })
    )

    await supabase.from('face_matches').upsert(
      photosWithUrls.map((photo) => ({
        guest_id: guest.id,
        photo_id: photo.id,
        similarity_score: photo.similarity,
        matched_at: new Date().toISOString(),
      })),
      { onConflict: 'guest_id,photo_id' }
    )

    photosWithUrls.sort((a, b) => b.similarity - a.similarity)

    return NextResponse.json({
      success: true,
      matchesFound: photosWithUrls.length,
      photos: photosWithUrls,
      guestName: guest.name,
    })
  } catch (error: any) {
    console.error('Error en match-faces:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    )
  }
}