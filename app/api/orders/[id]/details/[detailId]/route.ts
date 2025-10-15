import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const orderDetailUpdateSchema = z.object({
  cantidad: z.number().int().positive("Cantidad debe ser positiva"),
});

// PATCH - Actualizar la cantidad de un producto en el pedido
export async function PATCH(
  request: Request,
  { params }: { params: { id: string; detailId: string } }
) {
  try {
    const body = await request.json();
    const parsed = orderDetailUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Verificar que el detalle existe y pertenece al pedido
    const { data: detail, error: detailError } = await supabase
      .from("DetallePedidos")
      .select("*, Productos(nombre, precio, stock)")
      .eq("id", params.detailId)
      .eq("pedido", params.id)
      .single();

    if (detailError || !detail) {
      return NextResponse.json(
        { error: "Detalle no encontrado" },
        { status: 404 }
      );
    }

    // Verificar stock del producto
    const product = Array.isArray(detail.Productos)
      ? detail.Productos[0]
      : detail.Productos;

    if (product && product.stock < parsed.data.cantidad) {
      return NextResponse.json(
        {
          error: `Stock insuficiente. Disponible: ${product.stock}`,
        },
        { status: 400 }
      );
    }

    // Actualizar el detalle
    const { data, error } = await supabase
      .from("DetallePedidos")
      .update({ cantidad: parsed.data.cantidad })
      .eq("id", params.detailId)
      .eq("pedido", params.id)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Retornar el detalle con información del producto
    const enrichedDetail = {
      ...data,
      nombreProducto: product?.nombre,
      precio: product ? Number(product.precio) : 0,
    };

    return NextResponse.json({ data: enrichedDetail });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar un producto del pedido
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string; detailId: string } }
) {
  try {
    // Verificar que el detalle existe y pertenece al pedido
    const { data: detail, error: detailError } = await supabase
      .from("DetallePedidos")
      .select("id")
      .eq("id", params.detailId)
      .eq("pedido", params.id)
      .single();

    if (detailError || !detail) {
      return NextResponse.json(
        { error: "Detalle no encontrado" },
        { status: 404 }
      );
    }

    // Eliminar el detalle
    const { error } = await supabase
      .from("DetallePedidos")
      .delete()
      .eq("id", params.detailId)
      .eq("pedido", params.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}
