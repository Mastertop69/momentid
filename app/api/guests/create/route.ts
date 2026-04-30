import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const eventId  = formData.get("eventId") as string;
    const name     = (formData.get("name") as string)?.trim();
    const phone    = (formData.get("phone") as string)?.trim();
    const email    = (formData.get("email") as string)?.trim() || null;
    const consent  = formData.get("consent") === "true";
    const selfie   = formData.get("selfie") as File | null;

    // Validaciones
    if (!eventId || !name || !phone || !selfie) {
      return NextResponse.json({ error: "Faltan campos obligatorios." }, { status: 400 });
    }
    if (!consent) {
      return NextResponse.json({ error: "Debés aceptar los términos." }, { status: 400 });
    }
    if (selfie.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "La imagen supera el límite de 10 MB." }, { status: 400 });
    }

    // Verificar que el evento existe y está activo
    const { data: event, error: eventError } = await supabaseAdmin
      .from("events")
      .select("id, selfie_upload_enabled")
      .eq("id", eventId)
      .eq("status", "active")
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: "El evento no existe o no está activo." }, { status: 404 });
    }

    if (!event.selfie_upload_enabled) {
      return NextResponse.json({ error: "El registro está cerrado." }, { status: 403 });
    }

    // Subir selfie al bucket privado
    const guestId    = uuidv4();
    const ext        = selfie.name.split(".").pop() || "jpg";
    const selfiePath = `${eventId}/${guestId}.${ext}`;
    const selfieBuffer = await selfie.arrayBuffer();

    const { error: uploadError } = await supabaseAdmin.storage
      .from("selfies")
      .upload(selfiePath, selfieBuffer, {
        contentType: selfie.type,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ error: "Error al subir la selfie." }, { status: 500 });
    }

    // Guardar invitado en la base de datos
    const { error: insertError } = await supabaseAdmin
      .from("guests")
      .insert({
        id:               guestId,
        event_id:         eventId,
        name,
        phone,
        email,
        selfie_path:      selfiePath,
        consent_accepted: consent,
      });

    if (insertError) {
      await supabaseAdmin.storage.from("selfies").remove([selfiePath]);
      return NextResponse.json({ error: "Error al guardar tu registro." }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Registro exitoso." }, { status: 201 });

  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}