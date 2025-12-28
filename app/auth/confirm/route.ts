// Importamos las herramientas necesarias para la autenticación
import { type EmailOtpType } from "@supabase/supabase-js"; // Tipo de verificación por email (OTP = One Time Password)
import { type NextRequest } from "next/server"; // Tipo para las peticiones en Next.js
import { redirect } from "next/navigation"; // Para redirigir al usuario a otras páginas

import { createClient } from "@/lib/utils/supabase/server"; // Cliente de Supabase para el servidor

// Esta función maneja la confirmación de email cuando un usuario hace clic en el enlace
// que recibe en su correo electrónico para verificar su cuenta
export async function GET(request: NextRequest) {
  // PASO 1: Extraer los parámetros de la URL que vienen en el enlace del email
  const { searchParams } = new URL(request.url);

  // token_hash: código único y temporal que viene en el enlace del email
  const token_hash = searchParams.get("token_hash");

  // type: tipo de verificación (puede ser "signup", "recovery", etc.)
  const type = searchParams.get("type") as EmailOtpType | null;

  // next: página a la que queremos redirigir al usuario después de confirmar
  // Si no se especifica, por defecto va a la página principal "/"
  const next = searchParams.get("next") ?? "/";

  // PASO 2: Verificar que tenemos los datos necesarios (token y tipo)
  if (token_hash && type) {
    // Creamos una conexión con Supabase para verificar el token
    const supabase = await createClient();

    // PASO 3: Intentar verificar el código OTP (One Time Password)
    // Esto confirma que el enlace del email es válido y no ha expirado
    const { error } = await supabase.auth.verifyOtp({
      type, // Tipo de verificación
      token_hash, // Código único del enlace
    });

    // PASO 4: Si la verificación fue exitosa (sin errores)
    if (!error) {
      // Redirigimos al usuario a la página especificada o a la página principal
      redirect(next);
    }
  }

  // PASO 5: Si algo salió mal (no hay token, el token es inválido, o hubo un error)
  // Redirigimos al usuario a una página de error con instrucciones
  redirect("/error");
}
