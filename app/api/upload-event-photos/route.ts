import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { indexFace, createCollection } from '@/lib/rekognition'
import { v4 as uuidv4 } from 'uuid'

// POST — público (solo invitados registrados)
// Recibe FormData: eventSlug, guestId, photos[] (múltiples archivos)

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const eventSlug = formData.get('eventSlug') as string
    const guestId = formData.get('guestId') as string
    const photos = formData.getAll('photos') as File[]

    // Validaciones básicas
    if (!eventSlug || !guestId || photos.length === 0) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios.' },
        { status: 400 }
      )
    }

    if (photos.length > 20) {
      return NextResponse.json(
        { error: 'Máximo 20 fotos por vez.' },
        { status: 400 }
      )
    }

    // Verificar que el evento existe y está activo
    const { data: event, error: eventError } = await supabaseAdmin
      .from('events')
      .select('id, status')
      .eq('slug', eventSlug)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ error: 'Evento no encontrado.' }, { status: 404 })
    }

    if (event.status !== 'active') {
      return NextResponse.json({ error: 'El evento no está activo.' }, { status: 403 })
    }

    // Verificar que el invitado existe y pertenece al evento
    const { data: guest, error: guestError } = await supabaseAdmin
      .from('guests')
      .select('id')
      .eq('id', guestId)
      .eq('event_id', event.id)
      .single()

    if (guestError || !guest) {
      return NextResponse.json({ error: 'Invitado no registrado en este evento.' }, { status: 403 })
    }

    // Asegurar que la colección de Rekognition existe
    await createCollection(eventSlug)

    // Procesar cada foto
    const results = []

    for (const photo of photos) {
      // Validar tamaño (max 15MB)
      if (photo.size > 15 * 1024 * 1024) {
        results.push({ name: photo.name, success: false, error: 'Foto muy grande (máx 15MB)' })
        continue
      }

      const photoId = uuidv4()
      const ext = photo.name.split('.').pop() || 'jpg'
      const storagePath = `${event.id}/${photoId}.${ext}`

      try {
        // Subir al bucket event-photos
        const arrayBuffer = await photo.arrayBuffer()
        const buffer = new Uint8Array(arrayBuffer)

        const { error: uploadError } = await supabaseAdmin.storage
          .from('event-photos')
          .upload(storagePath, buffer, {
            contentType: photo.type || 'image/jpeg',
            upsert: false,
          })

        if (uploadError) throw new Error(uploadError.message)

        // Indexar en Rekognition
        let faceIds: string[] = []
        let processedStatus = 'processed'

        try {
          faceIds = await indexFace(eventSlug, photoId, buffer)
        } catch (rekError) {
          console.error('Error Rekognition:', rekError)
          processedStatus = 'error_rekognition'
        }

        // Guardar en event_photos
        const { error: dbError } = await supabaseAdmin
          .from('event_photos')
          .insert({
            id: photoId,
            event_id: event.id,
            file_path: storagePath,
            processed_status: processedStatus,
            uploaded_by_guest_id: guestId,
          })

        if (dbError) throw new Error(dbError.message)

        results.push({ name: photo.name, success: true, photoId, facesFound: faceIds.length })

      } catch (err: any) {
        console.error(`Error procesando ${photo.name}:`, err)
        results.push({ name: photo.name, success: false, error: err.message })
      }
    }

    const exitosas = results.filter(r => r.success).length

    return NextResponse.json({
      success: true,
      message: `${exitosas} de ${photos.length} fotos subidas correctamente.`,
      results,
    }, { status: 201 })

  } catch (error: any) {
    console.error('Error en upload-event-photos:', error)
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 })
  }
}