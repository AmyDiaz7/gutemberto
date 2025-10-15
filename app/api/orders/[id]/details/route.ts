import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const orderDetailCreateSchema = z.object({
  producto: z.string().min(1, "Producto es requerido"),
  cantidad: z.number().int().positive("Cantidad debe ser positiva"),
});

// POST - Agregar un producto al pedido
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const parsed = orderDetailCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Verificar que el pedido existe
    const { data: order, error: orderError } = await supabase
      .from("Pedidos")
      .select("id")
      .eq("id", params.id)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: "Pedido no encontrado" },
        { status: 404 }
      );
    }

    // Verificar que el producto existe y hay stock suficiente
    const { data: product, error: productError } = await supabase
      .from("Productos")
      .select("sku, nombre, precio, stock")
      .eq("sku", parsed.data.producto)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { error: "Producto no encontrado" },
        { status: 404 }
      );
    }

    if (product.stock < parsed.data.cantidad) {
      return NextResponse.json(
        {
          error: `Stock insuficiente. Disponible: ${product.stock}`,
        },
        { status: 400 }
      );
    }

    // Crear el detalle del pedido
    const { data, error } = await supabase
      .from("DetallePedidos")
      .insert({
        pedido: params.id,
        producto: parsed.data.producto,
        cantidad: parsed.data.cantidad,
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Retornar el detalle con información del producto
    const enrichedDetail = {
      ...data,
      nombreProducto: product.nombre,
      precio: Number(product.precio),
    };

    return NextResponse.json({ data: enrichedDetail }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}
