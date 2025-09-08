import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const productUpdateSchema = z.object({
  nombre: z.string().min(1).optional(),
  precio: z.number().nonnegative().optional(),
  stock: z.number().int().nonnegative().optional(),
  categoria: z.string().min(1).optional(),
  estado: z.enum(["disponible", "agotado", "descontinuado"]).optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: { sku: string } }
) {
  const sku = params.sku;

  const { data, error } = await supabase
    .from("Productos")
    .select("*")
    .eq("sku", sku)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json({ data });
}

export async function PATCH(
  request: Request,
  { params }: { params: { sku: string } }
) {
  try {
    const body = await request.json();
    const parsed = productUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("Productos")
      .update(parsed.data)
      .eq("sku", params.sku)
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
  { params }: { params: { sku: string } }
) {
  const { error } = await supabase
    .from("Productos")
    .delete()
    .eq("sku", params.sku);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
