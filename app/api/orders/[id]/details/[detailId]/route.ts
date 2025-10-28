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

// Definimos un "schema" (esquema) que valida los datos para actualizar un detalle de pedido
// Solo permitimos modificar la cantidad, y debe ser un número entero positivo
const orderDetailUpdateSchema = z.object({
  cantidad: z.number().int().positive("Cantidad debe ser positiva"),
});

/**
 * Función PATCH - Actualizar la cantidad de un producto en un pedido
 * Se ejecuta cuando el cliente hace una petición PATCH a /api/orders/[id]/details/[detailId]
 * Por ejemplo: PATCH /api/orders/123/details/456
 *
 * @param request - La petición HTTP que contiene los nuevos datos (cantidad)
 * @param params - Los parámetros de la URL (id del pedido y detailId del producto)
 * @returns {Promise} El detalle actualizado o un error
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string; detailId: string } }
) {
  try {
    // Extraemos el cuerpo de la petición (los datos JSON que envió el cliente)
    const body = await request.json();

    // Validamos que los datos cumplan con nuestro esquema (cantidad debe ser positiva)
    // safeParse no lanza errores, solo devuelve success: true o false
    const parsed = orderDetailUpdateSchema.safeParse(body);

    // Si la validación falló, devolvemos un error 400 (Bad Request)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Verificamos que el detalle existe y pertenece al pedido especificado
    // Esto previene que alguien modifique un detalle que no le corresponde
    // .select("*, Productos(nombre, precio, stock)") trae el detalle Y la info del producto
    // .eq() significa "equal" (igual a) - filtra por id y pedido
    // .single() devuelve un solo resultado en lugar de un array
    const { data: detail, error: detailError } = await supabase
      .from("DetallePedidos")
      .select("*, Productos(nombre, precio, stock)")
      .eq("id", params.detailId)
      .eq("pedido", params.id)
      .single();

    // Si no encontramos el detalle, devolvemos error 404 (Not Found)
    if (detailError || !detail) {
      return NextResponse.json(
        { error: "Detalle no encontrado" },
        { status: 404 }
      );
    }

    // Extraemos la información del producto del detalle
    // A veces Supabase devuelve un array, otras veces un objeto, así que manejamos ambos casos
    const product = Array.isArray(detail.Productos)
      ? detail.Productos[0]
      : detail.Productos;

    // Verificamos que hay suficiente stock del producto
    // Si el cliente quiere 10 unidades pero solo hay 5, devolvemos error
    if (product && product.stock < parsed.data.cantidad) {
      return NextResponse.json(
        {
          error: `Stock insuficiente. Disponible: ${product.stock}`,
        },
        { status: 400 }
      );
    }

    // Si todo está bien, actualizamos la cantidad en la base de datos
    // .update() modifica los datos
    // .select("*") devuelve el registro actualizado
    const { data, error } = await supabase
      .from("DetallePedidos")
      .update({ cantidad: parsed.data.cantidad })
      .eq("id", params.detailId)
      .eq("pedido", params.id)
      .select("*")
      .single();

    // Si hubo un error al actualizar, devolvemos error 500 (Internal Server Error)
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Creamos un objeto "enriquecido" que incluye la información del producto
    // Esto evita que el cliente tenga que hacer otra petición para obtener el nombre y precio
    const enrichedDetail = {
      ...data, // Copiamos todos los datos del detalle
      nombreProducto: product?.nombre, // Agregamos el nombre del producto
      precio: product ? Number(product.precio) : 0, // Agregamos el precio como número
    };

    // Devolvemos el detalle actualizado al cliente
    return NextResponse.json({ data: enrichedDetail });
  } catch (e: any) {
    // Si ocurre algún error inesperado (no controlado), lo capturamos aquí
    return NextResponse.json(
      { error: e?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}

/**
 * Función DELETE - Eliminar un producto de un pedido
 * Se ejecuta cuando el cliente hace una petición DELETE a /api/orders/[id]/details/[detailId]
 * Por ejemplo: DELETE /api/orders/123/details/456
 *
 * @param _request - La petición HTTP (no se usa, por eso tiene _ al inicio)
 * @param params - Los parámetros de la URL (id del pedido y detailId del producto)
 * @returns {Promise} Confirmación de eliminación o un error
 */
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string; detailId: string } }
) {
  try {
    // Primero verificamos que el detalle existe y pertenece al pedido
    // Esto es importante para seguridad: no queremos que alguien elimine detalles de otros pedidos
    const { data: detail, error: detailError } = await supabase
      .from("DetallePedidos")
      .select("id") // Solo necesitamos el id para verificar que existe
      .eq("id", params.detailId) // Debe tener este id
      .eq("pedido", params.id) // Y pertenecer a este pedido
      .single();

    // Si el detalle no existe o no pertenece al pedido, devolvemos error 404
    if (detailError || !detail) {
      return NextResponse.json(
        { error: "Detalle no encontrado" },
        { status: 404 }
      );
    }

    // Si todo está bien, procedemos a eliminar el detalle
    // .delete() elimina el registro de la base de datos
    const { error } = await supabase
      .from("DetallePedidos")
      .delete()
      .eq("id", params.detailId)
      .eq("pedido", params.id);

    // Si hubo un error al eliminar, devolvemos error 500
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Si todo salió bien, devolvemos una confirmación
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    // Si ocurre algún error inesperado, lo capturamos aquí
    return NextResponse.json(
      { error: e?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}
