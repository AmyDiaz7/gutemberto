import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  // Get all categories from the database
  const { data, error } = await supabase
    .from("Productos")
    .select("categoria")
    .not("categoria", "is", null)
    .order("categoria");

  if (error) {
    console.error("Error fetching categories:", error);

    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Extract unique categories
  const uniqueCategories = Array.from(
    new Set(data.map((item) => item.categoria))
  ).filter(Boolean);

  return NextResponse.json(uniqueCategories);
}
