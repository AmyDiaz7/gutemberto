"use server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function getProducts(): Promise<
  {
    sku: string;
    nombre: string;
    precio: number;
    stock: number;
  }[]
> {
  const { data, error } = await supabase.from("Productos").select("*");

  if (error) {
    return [{ sku: "", nombre: "", precio: 0, stock: 0 }];
  }

  return data;
}
