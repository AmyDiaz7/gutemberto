export type Product = {
  sku: string;
  nombre: string;
  precio: number;
  stock: number;
  categoria: string;
  estado: "disponible" | "agotado" | "descontinuado"; // This is the enum estados_producto
};

/* Pedidos (id uuid, fecha timestamp, cliente int8, estado enum estados_pedido(pendiente, pagado, bodega, transportando, entregado), metodoEntrega enum metodo_entrega(recoger,domicilio)) 
    DetallePedidos (id uuid, producto varchar, pedido uuid, cantidad int8)*/
export type Order = {
  id: string;
  fecha: string; // ISO date string
  cliente: string; // Changed to string to match form input
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
