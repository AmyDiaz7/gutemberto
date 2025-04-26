export type Product = {
  sku: string;
  nombre: string;
  precio: number;
  stock: number;
  categoria: string;
  estado: "disponible" | "agotado" | "descontinuado"; // This is the enum estados_producto
};
