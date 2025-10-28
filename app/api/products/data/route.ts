// Importamos las herramientas necesarias para nuestra API
import { NextResponse } from "next/server"; // Para enviar respuestas HTTP al cliente
import { createClient } from "@supabase/supabase-js"; // Para conectarnos a la base de datos Supabase

// Creamos la conexión a nuestra base de datos Supabase
// Usamos variables de entorno para mantener seguras las credenciales
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!, // URL de nuestra base de datos
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! // Clave de acceso público
);

// Esta función maneja las peticiones GET (obtener/consultar productos)
// Se ejecuta cuando alguien envía una petición GET a /api/products/data
export async function GET(request: Request) {
  // PASO 1: Extraer los parámetros de búsqueda de la URL
  // Por ejemplo: /api/products/data?sort=nombre&order=asc&page=1
  const { searchParams } = new URL(request.url);

  // Obtenemos el campo por el cual ordenar (por defecto "sku")
  const sort = searchParams.get("sort") || "sku";

  // Obtenemos el orden (ascendente o descendente)
  const rawOrder = (searchParams.get("order") || "asc").toLowerCase();
  // Normalizamos el orden a "asc" o "desc"
  const order =
    rawOrder === "descending" || rawOrder === "desc" ? "desc" : "asc";

  // Cuántos productos mostrar por página (por defecto 10)
  const limit = parseInt(searchParams.get("limit") || "10");

  // Número de página actual (por defecto 1)
  const page = parseInt(searchParams.get("page") || "1");

  // Texto de búsqueda para filtrar productos
  const search = searchParams.get("search") || "";

  // PASO 2: Procesar los filtros avanzados
  // Categorías para filtrar (pueden ser múltiples, separadas por comas)
  const categorias = (searchParams.get("categoria")?.split(",") || []).filter(
    Boolean // Elimina valores vacíos
  );

  // Estados para filtrar (pueden ser múltiples, separados por comas)
  const estados = (searchParams.get("estado")?.split(",") || []).filter(
    Boolean // Elimina valores vacíos
  );

  // Calculamos desde qué registro empezar según la página
  // Si estamos en página 2 con límite 10, empezamos desde el registro 10
  const offset = (page - 1) * limit;

  // PASO 3: Construir la consulta a la base de datos
  // Creamos una consulta base que selecciona todos los campos de "Productos"
  // count: "exact" nos permite saber cuántos productos hay en total
  let query = supabase.from("Productos").select("*", { count: "exact" });

  // PASO 4: Aplicar filtro de búsqueda si existe
  if (search) {
    // Intentamos convertir la búsqueda a número
    const numericSearch = parseFloat(search);

    // Si es un número, buscamos en campos numéricos (precio, stock) y en SKU
    if (!isNaN(numericSearch)) {
      query.or(`precio.eq.${search},stock.eq.${search},sku.ilike.%${search}%`);
    } else {
      // Si no es número, buscamos solo en campos de texto (nombre y SKU)
      // ilike es búsqueda sin distinguir mayúsculas/minúsculas
      query.or(`nombre.ilike.%${search}%,sku.ilike.%${search}%`);
    }
  }

  // PASO 5: Aplicar filtro de categorías si se especificaron
  if (categorias.length > 0) {
    // .in() busca productos cuya categoría esté en el array de categorías
    query = query.in("categoria", categorias);
  }

  // PASO 6: Aplicar filtro de estados si se especificaron
  if (estados.length > 0) {
    // .in() busca productos cuyo estado esté en el array de estados
    query = query.in("estado", estados);
  }

  // PASO 7: Aplicar el ordenamiento
  // Por ejemplo: ordenar por "nombre" de forma ascendente (A-Z)
  query = query.order(sort, { ascending: order === "asc" });

  // PASO 8: Aplicar paginación (limitar resultados)
  // Si queremos página 1 con límite 10, obtenemos del 0 al 9
  // Si queremos página 2 con límite 10, obtenemos del 10 al 19
  query = query.range(offset, offset + limit - 1);

  // PASO 9: Ejecutar la consulta y esperar los resultados
  const { data, error, count } = await query;

  // PASO 10: Manejar errores de la base de datos
  if (error) {
    // Devolvemos un error 500 (error del servidor) si algo salió mal
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // PASO 11: Devolver los productos con información de paginación
  return NextResponse.json({
    data, // Los productos encontrados
    pagination: {
      total: count, // Número total de productos (sin paginación)
      page, // Página actual
      limit, // Productos por página
      totalPages: Math.ceil((count || 0) / limit), // Número total de páginas
    },
  });
}
