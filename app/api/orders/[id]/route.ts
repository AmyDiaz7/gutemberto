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

// Definimos un "schema" (esquema) que valida los datos para actualizar un pedido
// Todos los campos son opcionales (.optional()) excepto el estado
// Esto permite actualizar solo algunos campos sin tener que enviar todos
const orderUpdateSchema = z.object({
  fecha: z.string().min(1).optional(), // Fecha del pedido (opcional)
  cliente: z.string().min(1).optional(), // ID del cliente (opcional)
  estado: z.enum([
    // Estado del pedido (requerido, debe ser uno de estos valores)
    "pendiente",
    "pagado",
    "bodega",
    "transportando",
    "entregado",
  ]),
  metodoEntrega: z.enum(["recoger", "domicilio"]).optional(), // Forma de entrega (opcional)
});

/**
 * Función GET - Obtener un pedido específico con todos sus detalles
 * Se ejecuta cuando el cliente hace una petición GET a /api/orders/[id]
 * Por ejemplo: GET /api/orders/123
 *
 * @param _request - La petición HTTP (no se usa, por eso tiene _ al inicio)
 * @param params - Los parámetros de la URL (id del pedido)
 * @returns {Promise} El pedido completo con información del cliente y productos
 */
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  // Extraemos el id del pedido de los parámetros de la URL
  const id = params.id;

  // PASO 1: Buscamos el pedido en la base de datos
  // .select("*") significa "traer todas las columnas"
  // .eq("id", id) filtra por el id específico
  // .single() devuelve un solo resultado en lugar de un array
  const { data: order, error: orderError } = await supabase
    .from("Pedidos")
    .select("*")
    .eq("id", id)
    .single();

  // Si el pedido no existe, devolvemos error 404 (Not Found)
  if (orderError) {
    return NextResponse.json({ error: orderError.message }, { status: 404 });
  }

  // eslint-disable-next-line no-console
  console.log("Order data:", order);
  // eslint-disable-next-line no-console
  console.log("Looking for client with ID:", order.cliente);

  // PASO 2: Buscamos la información del cliente asociado al pedido
  // Solo necesitamos el nombre del cliente para mostrarlo
  const { data: cliente, error: clienteError } = await supabase
    .from("Clientes")
    .select("nombre")
    .eq("id", order.cliente)
    .single();

  // eslint-disable-next-line no-console
  console.log("Client data:", cliente, "Error:", clienteError);

  // Creamos un objeto "enriquecido" del pedido con el nombre del cliente
  // Si no encontramos el cliente, usamos "Cliente desconocido" como valor por defecto
  const enrichedOrder = {
    ...order, // Copiamos todos los datos del pedido
    nombreCliente: cliente?.nombre || "Cliente desconocido", // Agregamos el nombre del cliente
  };

  // PASO 3: Obtenemos todos los productos (detalles) que tiene este pedido
  // Un pedido puede tener múltiples productos, por eso puede devolver varios resultados
  const { data: details, error: detailsError } = await supabase
    .from("DetallePedidos")
    .select("*")
    .eq("pedido", id); // Filtramos por el id del pedido

  // Si hay un error al obtener los detalles, devolvemos error 500
  if (detailsError) {
    return NextResponse.json({ error: detailsError.message }, { status: 500 });
  }

  // eslint-disable-next-line no-console
  console.log("Order details from DB:", details);

  // PASO 4: Para cada detalle, buscamos la información del producto
  // Promise.all() ejecuta todas las búsquedas en paralelo para ser más rápido
  const enrichedDetails = await Promise.all(
    (details || []).map(async (detail: any) => {
      // Buscamos el producto por su SKU (código único del producto)
      const { data: product, error: productError } = await supabase
        .from("Productos")
        .select("nombre, precio") // Solo necesitamos nombre y precio
        .eq("sku", detail.producto)
        .single();

      // eslint-disable-next-line no-console
      console.log(
        `Product lookup for SKU ${detail.producto}:`,
        product,
        productError
      );

      // Devolvemos un objeto con toda la información del detalle + info del producto
      return {
        id: detail.id, // ID del detalle
        cantidad: detail.cantidad, // Cantidad de unidades
        pedido: detail.pedido, // ID del pedido al que pertenece
        producto: detail.producto, // SKU del producto
        nombreProducto: product?.nombre || "Producto desconocido", // Nombre del producto
        precio: Number(product?.precio) || 0, // Precio como número
      };
    })
  );

  // eslint-disable-next-line no-console
  console.log("Enriched details:", enrichedDetails);

  // PASO 5: Devolvemos el pedido completo con toda la información enriquecida
  // El cliente recibirá: datos del pedido + nombre del cliente + lista de productos con sus detalles
  return NextResponse.json({
    data: enrichedOrder,
    details: enrichedDetails,
  });
}

/**
 * Función PATCH - Actualizar un pedido existente
 * Se ejecuta cuando el cliente hace una petición PATCH a /api/orders/[id]
 * Por ejemplo: PATCH /api/orders/123
 * Permite actualizar campos como: fecha, cliente, estado, método de entrega
 *
 * @param request - La petición HTTP que contiene los datos a actualizar
 * @param params - Los parámetros de la URL (id del pedido)
 * @returns {Promise} El pedido actualizado o un error
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Extraemos el cuerpo de la petición (los datos JSON que envió el cliente)
    const body = await request.json();

    // Validamos que los datos cumplan con nuestro esquema
    // Por ejemplo, el estado debe ser uno de los valores permitidos
    const parsed = orderUpdateSchema.safeParse(body);

    // Si la validación falló, devolvemos error 400 (Bad Request)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Actualizamos el pedido en la base de datos
    // .update() modifica solo los campos que enviamos
    // .eq("id", params.id) asegura que solo actualizamos el pedido correcto
    // .select("*") devuelve el pedido actualizado
    // .maybeSingle() devuelve null si no encuentra nada, en lugar de error
    const { data, error } = await supabase
      .from("Pedidos")
      .update(parsed.data)
      .eq("id", params.id)
      .select("*")
      .maybeSingle();

    // Si hubo un error al actualizar, devolvemos error 500
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Devolvemos el pedido actualizado
    return NextResponse.json({ data });
  } catch (e: any) {
    // Si ocurre algún error inesperado, lo capturamos aquí
    return NextResponse.json(
      { error: e?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}

/**
 * Función DELETE - Eliminar un pedido
 * Se ejecuta cuando el cliente hace una petición DELETE a /api/orders/[id]
 * Por ejemplo: DELETE /api/orders/123
 * ⚠️ ATENCIÓN: Esta acción elimina permanentemente el pedido de la base de datos
 *
 * @param _request - La petición HTTP (no se usa, por eso tiene _ al inicio)
 * @param params - Los parámetros de la URL (id del pedido a eliminar)
 * @returns {Promise} Confirmación de eliminación o un error
 */
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  // Eliminamos el pedido de la base de datos
  // .delete() elimina el registro permanentemente
  // .eq("id", params.id) asegura que solo eliminamos el pedido correcto
  const { error } = await supabase.from("Pedidos").delete().eq("id", params.id);

  // Si hubo un error al eliminar, devolvemos error 500
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Si todo salió bien, devolvemos una confirmación
  return NextResponse.json({ ok: true });
}
