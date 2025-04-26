// This file creates an API endpoint that fetches product data from a database

import { NextResponse } from "next/server"; // Used to send back responses from our API
import { createClient } from "@supabase/supabase-js"; // Helps us connect to our Supabase database

// Connect to our Supabase database using environment variables (secret keys)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!, // The URL of our database
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! // The key to access our database
);

// This function runs whenever someone visits /api/data with a GET request
export async function GET(request: Request) {
  // Get the URL and extract any parameters after the ? symbol (like ?sort=price&limit=20)
  const { searchParams } = new URL(request.url);

  // Get each parameter from the URL, with default values if they're not provided
  const sort = searchParams.get("sort") || "sku"; // Which column to sort by (defaults to 'id')
  const order = searchParams.get("order") || "asc"; // Sort order: ascending or descending (defaults to 'asc')
  const limit = parseInt(searchParams.get("limit") || "10"); // How many products per page (defaults to 10)
  const page = parseInt(searchParams.get("page") || "1"); // Which page to show (defaults to page 1)
  const search = searchParams.get("search") || ""; // Text to search for (defaults to empty)

  // Get all values for multi-select filters
  const categorias = searchParams.get("categoria")?.split(",") || [];
  const estados = searchParams.get("estado")?.split(",") || [];

  // Calculate where to start getting products from (for pagination)
  // Example: on page 1 with limit 10, start at 0. On page 2, start at 10.
  const offset = (page - 1) * limit;

  // Start building our database query to get products
  let query = supabase.from("Productos").select("*", { count: "exact" });

  // If the user is searching for something, add a filter to the query
  if (search) {
    // Try to convert search to a number for numeric fields
    const numericSearch = parseFloat(search);

    if (!isNaN(numericSearch)) {
      query.or(`precio.eq.${search},stock.eq.${search},sku.ilike.%${search}%`);
    } else {
      query.or(`nombre.ilike.%${search}%,sku.ilike.%${search}%`);
    }
  }

  // Apply categoria filter (if one or more selected)
  if (categorias.length > 0) {
    console.log(categorias);
    query = query.in("categoria", categorias);
  }

  // Apply estado filter (if one or more selected)
  if (estados.length > 0) {
    console.log(estados);
    query = query.in("estado", estados);
  }

  // Sort the results by the column and direction specified
  query = query.order(sort, { ascending: order.toLowerCase() === "ascending" });

  // Only get the specific "page" of results we need
  query = query.range(offset, offset + limit - 1);

  // Now actually run the query we've built
  const { data, error, count } = await query;

  // If something went wrong, return an error message
  if (error) {
    console.error("Error fetching products:", error.message);

    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Return the products and information about the pagination
  return NextResponse.json({
    data, // The product data we found
    pagination: {
      total: count, // Total number of products in the database
      page, // Current page number
      limit, // How many products per page
      totalPages: Math.ceil((count || 0) / limit), // Calculate total number of pages
    },
  });
}
