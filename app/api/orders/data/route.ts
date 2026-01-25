// Importamos NextResponse para enviar respuestas HTTP desde nuestra API
import { NextResponse } from "next/server";
// Importamos createClient para conectarnos a nuestra base de datos Supabase
import { createClient } from "@supabase/supabase-js";

// Creamos una conexión a Supabase usando las credenciales del archivo .env
// Esta conexión nos permite hacer consultas a la base de datos
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * Función GET - Obtener una lista de pedidos con filtros, ordenamiento y paginación
 * Se ejecuta cuando el cliente hace una petición GET a /api/orders/data
 * Ejemplo: GET /api/orders/data?sort=fecha&order=desc&limit=10&page=1&estado=pendiente,pagado
 *
 * Esta función es especialmente útil para mostrar tablas de datos con muchas opciones
 * de filtrado, ordenamiento y navegación por páginas
 *
 * @param request - La petición HTTP que contiene los parámetros de búsqueda en la URL
 * @returns {Promise} Lista de pedidos con información de paginación
 */
export async function GET(request: Request) {
  // Extraemos los parámetros de búsqueda de la URL
  // Por ejemplo, en la URL: /api/orders/data?sort=fecha&limit=10
  // searchParams nos da acceso a "sort", "limit", etc.
  const { searchParams } = new URL(request.url);

  // PARÁMETRO: Por cuál campo ordenar (fecha, cliente, estado, etc.)
  // Si no se especifica, usamos "fecha" por defecto
  const sort = searchParams.get("sort") || "fecha";

  // PARÁMETRO: Orden ascendente (asc) o descendente (desc)
  // "asc" = de menor a mayor (A-Z, 1-10, fechas antiguas primero)
  // "desc" = de mayor a menor (Z-A, 10-1, fechas recientes primero)
  const rawOrder = (searchParams.get("order") || "asc").toLowerCase();
  const order =
    rawOrder === "descending" || rawOrder === "desc" ? "desc" : "asc";

  // PARÁMETRO: Cuántos pedidos mostrar por página
  // parseInt() convierte el texto "10" al número 10
  const limit = parseInt(searchParams.get("limit") || "10");

  // PARÁMETRO: Qué página mostrar (1, 2, 3...)
  const page = parseInt(searchParams.get("page") || "1");

  // PARÁMETRO: Texto de búsqueda (puede ser un ID o número de pedido)
  const search = searchParams.get("search") || "";

  // PARÁMETRO: Filtrar por método de entrega (recoger, domicilio)
  // Puede venir como "recoger,domicilio" y lo convertimos en un array
  // .split(",") separa el texto por comas
  // .filter(Boolean) elimina valores vacíos
  const metodos = (searchParams.get("metodo")?.split(",") || []).filter(
    Boolean
  );

  // PARÁMETRO: Filtrar por estado (pendiente, pagado, bodega, etc.)
  const estados = (searchParams.get("estado")?.split(",") || []).filter(
    Boolean
  );

  // Calculamos el "offset" (desde dónde empezar a mostrar resultados)
  // Ejemplo: página 1 con límite 10 = offset 0 (mostrar del 0 al 9)
  //          página 2 con límite 10 = offset 10 (mostrar del 10 al 19)
  const offset = (page - 1) * limit;

  // Si hay un texto de búsqueda, validamos que sea un formato válido
  if (search) {
    // Verificamos si es un número puro (como "123")
    const isNumeric = /^\d+$/.test(search);

    // Verificamos si es un UUID (formato: 8-4-4-4-12 caracteres hexadecimales)
    // Ejemplo: "550e8400-e29b-41d4-a716-446655440000"
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    // Si no es ni UUID ni número, no hay resultados posibles
    // (porque los IDs de pedidos son UUIDs o números)
    if (!uuidRegex.test(search) && !isNumeric) {
      return NextResponse.json({
        data: [],
        pagination: {
          total: 0,
          page,
          limit,
          totalPages: 0,
        },
      });
    }
  }

  // Construimos la consulta base a Supabase
  // .select("*", { count: "exact" }) trae todos los campos Y cuenta el total de resultados
  let query = supabase.from("Pedidos").select("*", { count: "exact" });

  // Si se especificaron métodos de entrega, filtramos por ellos
  // .in() busca registros donde el campo esté en la lista de valores
  // Ejemplo: .in("metodoEntrega", ["recoger", "domicilio"])
  if (metodos.length > 0) {
    query = query.in("metodoEntrega", metodos);
  }

  // Si se especificaron estados, filtramos por ellos
  if (estados.length > 0) {
    query = query.in("estado", estados);
  }

  // Aplicamos el ordenamiento
  // { ascending: true } = orden ascendente (A-Z, 1-10)
  // { ascending: false } = orden descendente (Z-A, 10-1)
  query = query.order(sort, { ascending: order === "asc" });

  // Aplicamos la paginación
  // .range(inicio, fin) devuelve solo los resultados en ese rango
  // Ejemplo: .range(0, 9) devuelve los primeros 10 resultados
  query = query.range(offset, offset + limit - 1);

  // Ejecutamos la consulta
  // data = los pedidos encontrados
  // error = si hubo algún error
  // count = número total de pedidos (sin paginación)
  const { data, error, count } = await query;

  // Si hubo un error en la consulta, lo mostramos y devolvemos error 500
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Devolvemos los pedidos con información de paginación
  return NextResponse.json({
    data, // Los pedidos de la página actual
    pagination: {
      total: count, // Total de pedidos en la base de datos
      page, // Página actual
      limit, // Pedidos por página
      totalPages: Math.ceil((count || 0) / limit), // Total de páginas
      // Math.ceil() redondea hacia arriba (ejemplo: 25/10 = 2.5 → 3 páginas)
    },
  });
}
