import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const productSchema = z.object({
  id: z.string().min(1),
  fecha: z.string().min(1),
  cliente: z.string().min(1),
  estado: z.enum([
    "pendiente",
    "pagado",
    "bodega",
    "transportando",
    "entregado",
  ]),
  metodoEntrega: z.enum(["recoger", "domicilio"]),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = productSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("Pedidos")
      .insert(parsed.data)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}
