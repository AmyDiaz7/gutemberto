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

// Definimos el "esquema" o estructura que debe tener un producto válido
// Esto es como una plantilla que verifica que todos los datos sean correctos antes de guardarlos
const productSchema = z.object({
  sku: z.string().min(1), // SKU (código único del producto) debe ser texto con al menos 1 caracter
  nombre: z.string().min(1), // Nombre del producto debe tener al menos 1 caracter
  precio: z.number().nonnegative(), // Precio debe ser un número positivo o cero (no puede ser negativo)
  stock: z.number().int().nonnegative(), // Stock debe ser un número entero positivo o cero
  categoria: z.string().min(1), // Categoría debe ser texto con al menos 1 caracter
  // El estado solo puede ser uno de estos 3 valores exactos
  estado: z.enum(["disponible", "agotado", "descontinuado"]),
});

// Esta función maneja las peticiones POST (crear nuevos productos)
// Se ejecuta cuando alguien envía una petición POST a /api/products
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

    // PASO 3: Insertar el nuevo producto en la base de datos
    const { data, error } = await supabase
      .from("Productos") // Tabla donde guardamos los productos
      .insert(parsed.data) // Insertamos los datos validados
      .select("*") // Seleccionamos todos los campos del producto creado
      .single(); // Esperamos solo un resultado (el producto que acabamos de crear)

    // Si hubo un error al guardar en la base de datos
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 } // Código 500 significa "error del servidor"
      );
    }

    // PASO 4: Todo salió bien, devolvemos el producto creado
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
