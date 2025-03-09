"use server";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  getKeyValue,
} from "@heroui/react";

import ProductTable from "./components/ProductTable";

import { getProducts } from "@/lib/actions/databaseActions";

export default async function App() {
  const products: {
    sku: string;
    nombre: string;
    precio: number;
    stock: number;
  }[] = await getProducts();

  return <ProductTable rows={products} />;
}
