// Importamos NextResponse que nos permite enviar respuestas HTTP desde nuestra API
import { NextResponse } from "next/server";
// Importamos createClient para conectarnos a nuestra base de datos Supabase
import { createClient } from "@supabase/supabase-js";

// Creamos una conexión a Supabase usando las credenciales del archivo .env
// process.env.VARIABLE_NAME nos permite acceder a las variables de entorno
// El símbolo "!" le dice a TypeScript que estamos seguros que la variable existe
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * Función GET - Se ejecuta cuando alguien hace una petición GET a /api/categories
 * Esta función obtiene todas las categorías únicas de productos de la base de datos
 * @returns {Promise} Una lista de categorías únicas en formato JSON
 */
export async function GET() {
  // Hacemos una consulta a la base de datos
  // .from("Productos") - Seleccionamos la tabla "Productos"
  // .select("categoria") - Solo queremos la columna "categoria"
  // .not("categoria", "is", null) - Excluimos productos sin categoría
  // .order("categoria") - Ordenamos alfabéticamente
  const { data, error } = await supabase
    .from("Productos")
    .select("categoria")
    .not("categoria", "is", null)
    .order("categoria");

  // Si hubo un error al consultar la base de datos
  if (error) {
    // Mostramos el error en la consola del servidor para debugging
    console.error("Error fetching categories:", error);

    // Devolvemos un mensaje de error al cliente con código de estado 500
    // El código 500 significa "Error interno del servidor"
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Creamos un array con categorías únicas (sin duplicados)
  // 1. data.map() - Extraemos solo el valor de "categoria" de cada producto
  // 2. new Set() - Eliminamos los duplicados (Set solo guarda valores únicos)
  // 3. Array.from() - Convertimos el Set de vuelta a un array normal
  // 4. .filter(Boolean) - Eliminamos valores nulos o vacíos
  const uniqueCategories = Array.from(
    new Set(data.map((item) => item.categoria))
  ).filter(Boolean);

  // Devolvemos las categorías únicas en formato JSON
  // El cliente recibirá algo como: ["Electrónica", "Ropa", "Alimentos"]
  return NextResponse.json(uniqueCategories);
}
