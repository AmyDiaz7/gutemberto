import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const orderUpdateSchema = z.object({
  fecha: z.string().min(1).optional(),
  cliente: z.string().min(1).optional(),
  estado: z.enum([
    "pendiente",
    "pagado",
    "bodega",
    "transportando",
    "entregado",
  ]),
  metodoEntrega: z.enum(["recoger", "domicilio"]).optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const id = params.id;

  // Get the order
  const { data: order, error: orderError } = await supabase
    .from("Pedidos")
    .select("*")
    .eq("id", id)
    .single();

  if (orderError) {
    return NextResponse.json({ error: orderError.message }, { status: 404 });
  }

  // eslint-disable-next-line no-console
  console.log("Order data:", order);
  // eslint-disable-next-line no-console
  console.log("Looking for client with ID:", order.cliente);

  // Get client information
  const { data: cliente, error: clienteError } = await supabase
    .from("Clientes")
    .select("nombre")
    .eq("id", order.cliente)
    .single();

  // eslint-disable-next-line no-console
  console.log("Client data:", cliente, "Error:", clienteError);

  // Add client name to order
  const enrichedOrder = {
    ...order,
    nombreCliente: cliente?.nombre || "Cliente desconocido",
  };

  // Get the order details
  const { data: details, error: detailsError } = await supabase
    .from("DetallePedidos")
    .select("*")
    .eq("pedido", id);

  if (detailsError) {
    return NextResponse.json({ error: detailsError.message }, { status: 500 });
  }

  // eslint-disable-next-line no-console
  console.log("Order details from DB:", details);

  // Get product information for each detail
  const enrichedDetails = await Promise.all(
    (details || []).map(async (detail: any) => {
      const { data: product, error: productError } = await supabase
        .from("Productos")
        .select("nombre, precio")
        .eq("sku", detail.producto)
        .single();

      // eslint-disable-next-line no-console
      console.log(
        `Product lookup for SKU ${detail.producto}:`,
        product,
        productError
      );

      return {
        id: detail.id,
        cantidad: detail.cantidad,
        pedido: detail.pedido,
        producto: detail.producto,
        nombreProducto: product?.nombre || "Producto desconocido",
        precio: Number(product?.precio) || 0,
      };
    })
  );

  // eslint-disable-next-line no-console
  console.log("Enriched details:", enrichedDetails);

  return NextResponse.json({
    data: enrichedOrder,
    details: enrichedDetails,
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const parsed = orderUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("Pedidos")
      .update(parsed.data)
      .eq("id", params.id)
      .select("*")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const { error } = await supabase.from("Pedidos").delete().eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
