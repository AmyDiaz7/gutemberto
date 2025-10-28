export type Product = {
  sku: string;
  nombre: string;
  precio: number;
  stock: number;
  categoria: string;
  estado: "disponible" | "agotado" | "descontinuado";
};

export type Order = {
  id: string;
  fecha: string;
  cliente: string;
  estado: "pendiente" | "pagado" | "bodega" | "transportando" | "entregado";
  metodoEntrega: "recoger" | "domicilio";
  nombreCliente?: string;
};
export type OrderDetail = {
  id: string;
  producto: string;
  pedido: string;
  cantidad: number;
  nombreProducto?: string;
  precio?: number;
};
