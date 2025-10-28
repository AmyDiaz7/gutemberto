// Importamos las herramientas necesarias para nuestra API
import { NextResponse } from "next/server"; // Para enviar respuestas HTTP al cliente
import { z } from "zod"; // Para validar que los datos recibidos sean correctos
import { createClient } from "@supabase/supabase-js"; // Para conectarnos a la base de datos Supabase

// Creamos la conexión a nuestra base de datos Supabase
// Usamos variables de entorno para mantener seguras las credenciales
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!, // URL de nuestra base de datos
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! // Clave de acceso público
);

// Definimos el "esquema" o estructura que debe tener un pedido válido
// Esto es como una plantilla que verifica que todos los datos sean correctos
const productSchema = z.object({
  id: z.string().min(1), // El ID debe ser un texto con al menos 1 caracter
  fecha: z.string().min(1), // La fecha debe ser un texto con al menos 1 caracter
  cliente: z.string().min(1), // El nombre del cliente debe tener al menos 1 caracter
  // El estado solo puede ser uno de estos 5 valores exactos
  estado: z.enum([
    "pendiente", // El pedido está pendiente de pago
    "pagado", // El pedido ya fue pagado
    "bodega", // El pedido está en la bodega
    "transportando", // El pedido está siendo enviado
    "entregado", // El pedido ya fue entregado al cliente
  ]),
  // El método de entrega solo puede ser uno de estos 2 valores
  metodoEntrega: z.enum(["recoger", "domicilio"]), // "recoger" en tienda o "domicilio" a casa
});

// Esta función maneja las peticiones POST (crear nuevos pedidos)
// Se ejecuta cuando alguien envía una petición POST a /api/orders
export async function POST(request: Request) {
  try {
    // PASO 1: Obtener los datos que envió el cliente en formato JSON
    const json = await request.json();

    // PASO 2: Validar que los datos recibidos cumplan con nuestro esquema
    // safeParse revisa si los datos son correctos sin lanzar un error
    const parsed = productSchema.safeParse(json);

    // Si los datos NO son válidos, devolvemos un error 400 (Bad Request)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400 } // Código 400 significa "solicitud incorrecta"
      );
    }

    // PASO 3: Insertar el nuevo pedido en la base de datos
    const { data, error } = await supabase
      .from("Pedidos") // Tabla donde guardamos los pedidos
      .insert(parsed.data) // Insertamos los datos validados
      .select("*") // Seleccionamos todos los campos del pedido creado
      .single(); // Esperamos solo un resultado (el pedido que acabamos de crear)

    // Si hubo un error al guardar en la base de datos
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 } // Código 500 significa "error del servidor"
      );
    }

    // PASO 4: Todo salió bien, devolvemos el pedido creado
    return NextResponse.json(
      { data },
      { status: 201 } // Código 201 significa "creado exitosamente"
    );
  } catch (e: any) {
    // Si ocurrió cualquier error inesperado, lo capturamos aquí
    return NextResponse.json(
      { error: e?.message || "Unexpected error" },
      { status: 500 } // Error del servidor
    );
  }
}
