import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// POST — público
// Recibe: { identifier, eventSlug }
// identifier puede ser teléfono o email

export async function POST(request: NextRequest) {
  try {
    const { identifier, eventSlug } = await request.json()

    if (!identifier || !eventSlug) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios.' },
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

    // Buscar invitado por teléfono o email
    const clean = identifier.trim().toLowerCase()

    const { data: guest, error: guestError } = await supabaseAdmin
      .from('guests')
      .select('id, name, phone, email')
      .eq('event_id', event.id)
      .or(`phone.ilike.%${clean}%,email.ilike.${clean}`)
      .single()

    if (guestError || !guest) {
      return NextResponse.json(
        { error: 'No encontramos tu registro. Verificá el teléfono o email.' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      guestId: guest.id,
      guestName: guest.name,
    })

  } catch (error: any) {
    console.error('Error en identify-guest:', error)
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 })
  }
}