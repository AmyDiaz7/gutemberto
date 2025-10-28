// Importamos NextResponse para enviar respuestas HTTP desde nuestra API
import { NextResponse } from "next/server";
// Importamos Zod para validar los datos que llegan del cliente
import { z } from "zod";
// Importamos createClient para conectarnos a nuestra base de datos Supabase
import { createClient } from "@supabase/supabase-js";

// Creamos una conexión a Supabase usando las credenciales del archivo .env
// Esta conexión nos permite hacer consultas a la base de datos
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Definimos un "schema" (esquema) que valida los datos para crear un detalle de pedido
// Necesitamos: el SKU del producto (string no vacío) y la cantidad (número entero positivo)
const orderDetailCreateSchema = z.object({
  producto: z.string().min(1, "Producto es requerido"),
  cantidad: z.number().int().positive("Cantidad debe ser positiva"),
});

/**
 * Función POST - Agregar un producto a un pedido existente
 * Se ejecuta cuando el cliente hace una petición POST a /api/orders/[id]/details
 * Por ejemplo: POST /api/orders/123/details
 *
 * @param request - La petición HTTP que contiene los datos del producto (sku y cantidad)
 * @param params - Los parámetros de la URL (id del pedido)
 * @returns {Promise} El detalle del pedido creado o un error
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Extraemos el cuerpo de la petición (los datos JSON que envió el cliente)
    const body = await request.json();

    // Validamos que los datos cumplan con nuestro esquema
    // Debe incluir: producto (SKU) y cantidad positiva
    const parsed = orderDetailCreateSchema.safeParse(body);

    // Si la validación falló, devolvemos un error 400 (Bad Request)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // PASO 1: Verificar que el pedido existe en la base de datos
    // No queremos agregar productos a un pedido que no existe
    const { data: order, error: orderError } = await supabase
      .from("Pedidos")
      .select("id") // Solo necesitamos el id para verificar existencia
      .eq("id", params.id) // Buscamos por el id que viene en la URL
      .single(); // Esperamos un solo resultado

    // Si el pedido no existe, devolvemos error 404 (Not Found)
    if (orderError || !order) {
      return NextResponse.json(
        { error: "Pedido no encontrado" },
        { status: 404 }
      );
    }

    // PASO 2: Verificar que el producto existe y obtener su información
    // Necesitamos el stock para validar que hay suficientes unidades
    const { data: product, error: productError } = await supabase
      .from("Productos")
      .select("sku, nombre, precio, stock") // Traemos toda la info del producto
      .eq("sku", parsed.data.producto) // Buscamos por el SKU que envió el cliente
      .single();

    // Si el producto no existe, devolvemos error 404
    if (productError || !product) {
      return NextResponse.json(
        { error: "Producto no encontrado" },
        { status: 404 }
      );
    }

    // PASO 3: Verificar que hay suficiente stock disponible
    // Si el cliente quiere 10 unidades pero solo hay 5, no podemos procesar el pedido
    if (product.stock < parsed.data.cantidad) {
      return NextResponse.json(
        {
          error: `Stock insuficiente. Disponible: ${product.stock}`,
        },
        { status: 400 }
      );
    }

    // PASO 4: Si todo está bien, creamos el detalle del pedido
    // .insert() agrega un nuevo registro a la tabla DetallePedidos
    // .select("*") devuelve el registro recién creado
    const { data, error } = await supabase
      .from("DetallePedidos")
      .insert({
        pedido: params.id, // El id del pedido
        producto: parsed.data.producto, // El SKU del producto
        cantidad: parsed.data.cantidad, // La cantidad solicitada
      })
      .select("*")
      .single();

    // Si hubo un error al crear el detalle, devolvemos error 500
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // PASO 5: Creamos un objeto "enriquecido" con información adicional del producto
    // Esto evita que el cliente tenga que hacer otra petición para obtener nombre y precio
    const enrichedDetail = {
      ...data, // Copiamos todos los datos del detalle creado
      nombreProducto: product.nombre, // Agregamos el nombre del producto
      precio: Number(product.precio), // Agregamos el precio como número
    };

    // Devolvemos el detalle creado con código 201 (Created - recurso creado exitosamente)
    return NextResponse.json({ data: enrichedDetail }, { status: 201 });
  } catch (e: any) {
    // Si ocurre algún error inesperado (no controlado), lo capturamos aquí
    return NextResponse.json(
      { error: e?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}
