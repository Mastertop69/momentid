import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createCollection, indexFace } from '@/lib/rekognition'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.ADMIN_SECRET}`) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { photoId, eventSlug } = await request.json()

    if (!photoId || !eventSlug) {
      return NextResponse.json(
        { error: 'Faltan campos: photoId y eventSlug' },
        { status: 400 }
      )
    }

    const { data: photo, error: photoError } = await supabase
      .from('event_photos')
      .select('*')
      .eq('id', photoId)
      .single()

    if (photoError || !photo) {
      return NextResponse.json({ error: 'Foto no encontrada' }, { status: 404 })
    }

    const { data: fileData, error: downloadError } = await supabase.storage
      .from('event-photos')
      .download(photo.storage_path)

    if (downloadError || !fileData) {
      return NextResponse.json(
        { error: 'Error al descargar la foto' },
        { status: 500 }
      )
    }

    const arrayBuffer = await fileData.arrayBuffer()
    const imageBytes = new Uint8Array(arrayBuffer)

    await createCollection(eventSlug)

    const faceIds = await indexFace(eventSlug, photoId, imageBytes)

    await supabase
      .from('event_photos')
      .update({
        processed: true,
        face_ids: faceIds,
        processed_at: new Date().toISOString(),
      })
      .eq('id', photoId)

    return NextResponse.json({
      success: true,
      photoId,
      facesFound: faceIds.length,
      faceIds,
    })
  } catch (error: any) {
    console.error('Error procesando foto:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    )
  }
}