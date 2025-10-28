// Indicamos que este componente se ejecuta en el navegador (lado del cliente)
"use client";

// Importamos el tipo Order que define la estructura de un pedido
import type { Order } from "@/lib/types/database";

// Importamos componentes de la librería HeroUI para crear tablas
import {
  Button, // Botones de acción
  Spinner, // Animación de carga
  Table, // Contenedor principal de la tabla
  TableBody, // Cuerpo de la tabla (filas de datos)
  TableCell, // Celda individual de la tabla
  TableColumn, // Definición de columna
  TableHeader, // Encabezado de la tabla
  TableRow, // Fila individual de la tabla
  getKeyValue, // Función auxiliar para obtener valores de objetos
  SortDescriptor, // Tipo para describir el orden de clasificación
} from "@heroui/react";
// Importamos íconos de lucide-react para los botones
import { Pencil, Trash2, Eye } from "lucide-react";
// Importamos clsx para manejar clases CSS condicionales
// Importamos clsx para manejar clases CSS condicionales
import clsx from "clsx";

// Definimos las columnas de la tabla con sus propiedades
const columns = [
  { key: "id", label: "ID", width: "16%" }, // Columna para el ID del pedido
  { key: "fecha", label: "Fecha", width: "28%" }, // Columna para la fecha del pedido
  { key: "cliente", label: "Cliente", width: "10%" }, // Columna para el nombre del cliente
  { key: "estado", label: "Estado", width: "10%" }, // Columna para el estado del pedido
  { key: "metodoEntrega", label: "Método", width: "10%" }, // Columna para el método de entrega
  { key: "acciones", label: "Acciones", width: "26%" }, // Columna para los botones de acción
] as const; // 'as const' hace que el array sea inmutable (no se puede cambiar)

// Definimos el tipo de las propiedades (props) que recibe este componente
type Props = {
  items: Order[]; // Array de pedidos a mostrar en la tabla
  loading: boolean; // Indica si la tabla está cargando datos
  sortDescriptor: SortDescriptor; // Describe cómo están ordenados los datos (columna y dirección)
  onDelete?: (id: string) => void; // Función opcional que se ejecuta al eliminar un pedido
  onEdit?: (item: Order) => void; // Función opcional que se ejecuta al editar un pedido
  onViewDetails?: (item: Order) => void; // Función opcional que se ejecuta al ver detalles
  onRowAction?: (key: string | number) => void; // Función opcional que se ejecuta al hacer clic en una fila
  onSortChange: (d: SortDescriptor) => void; // Función que se ejecuta cuando cambia el orden
};

export default function OrderDataTable({
  items,
  loading,
  onDelete,
  onEdit,
  onViewDetails,
  onRowAction,
  onSortChange,
  sortDescriptor,
}: Props) {
  return (
    <Table
      isHeaderSticky
      isStriped
      aria-label="Tabla de productos"
      classNames={{
        wrapper: "w-full overflow-x-auto pt-2",
        table: "min-w-[720px]",
        td: clsx("transition-opacity", { "opacity-30": loading }),
      }}
      selectionMode="single"
      sortDescriptor={sortDescriptor}
      onRowAction={(key) => onRowAction?.(String(key))} // Ejecuta acción al hacer clic en fila
      onSortChange={onSortChange} // Ejecuta acción al cambiar el orden
    >
      {/* Encabezado de la tabla con las columnas */}
      <TableHeader columns={columns as any}>
        {(column: any) => (
          <TableColumn
            key={column.key} // Identificador único de la columna
            allowsSorting // Permite ordenar por esta columna
            width={column.width as any} // Ancho de la columna
          >
            {column.label} {/* Texto que se muestra en el encabezado */}
          </TableColumn>
        )}
      </TableHeader>
      {/* Cuerpo de la tabla con las filas de datos */}
      <TableBody
        emptyContent="No se encontraron pedidos..." // Mensaje cuando no hay datos
        isLoading={loading} // Muestra el spinner si está cargando
        items={items} // Los pedidos a mostrar
        loadingContent={<Spinner label="Cargando..." />} // Contenido mientras carga
      >
        {/* Renderizamos cada pedido como una fila */}
        {(item: Order) => (
          <TableRow key={item.id}>
            {/* Renderizamos cada celda de la fila */}
            {(columnKey) => (
              <TableCell>
                {/* Si es la columna de acciones, mostramos los botones */}
                {columnKey === "acciones" ? (
                  <div className="flex gap-2">
                    {/* Botón para ver detalles del pedido */}
                    <Button
                      isDisabled={loading} // Deshabilitado mientras carga
                      size="sm"
                      variant="flat"
                      onPress={() => onViewDetails?.(item)} // Ejecuta función al presionar
                    >
                      <Eye size={14} /> Ver
                    </Button>
                    {/* Botón para editar el pedido */}
                    <Button
                      isDisabled={loading}
                      size="sm"
                      variant="flat"
                      onPress={() => onEdit?.(item)}
                    >
                      <Pencil size={14} /> Editar
                    </Button>
                    {/* Botón para eliminar el pedido */}
                    <Button
                      color="danger" // Color rojo para indicar acción peligrosa
                      isDisabled={loading}
                      size="sm"
                      variant="flat"
                      onPress={() => onDelete?.(item.id)}
                    >
                      <Trash2 size={14} /> Eliminar
                    </Button>
                  </div>
                ) : columnKey === "id" ? (
                  // Si es la columna ID, truncamos el texto si es muy largo
                  <div className="truncate max-w-[200px]" title={item.id}>
                    {item.id}
                  </div>
                ) : columnKey === "estado" ? (
                  // Si es la columna de estado, mostramos un badge con color según el estado
                  <span
                    className={clsx(
                      "px-2 py-1 text-xs font-semibold rounded-full",
                      {
                        // Verde para pedidos entregados
                        "bg-green-100 text-green-800":
                          item.estado === "entregado",
                        // Rojo para pedidos pendientes
                        "bg-red-100 text-red-800": item.estado === "pendiente",
                        // Amarillo para pedidos en bodega o transporte
                        "bg-yellow-100 text-yellow-800":
                          item.estado === "bodega" ||
                          item.estado === "transportando",
                        // Azul para pedidos pagados
                        "bg-blue-100 text-blue-800": item.estado === "pagado",
                      }
                    )}
                  >
                    {/* Convertimos la primera letra a mayúscula */}
                    {item.estado.charAt(0).toUpperCase() + item.estado.slice(1)}
                  </span>
                ) : columnKey === "metodoEntrega" ? (
                  // Si es la columna de método, mostramos el texto con primera letra en mayúscula
                  <span className="px-2 py-1 text-xs font-semibold rounded-full">
                    {item.metodoEntrega.charAt(0).toUpperCase() +
                      item.metodoEntrega.slice(1)}
                  </span>
                ) : (
                  // Para otras columnas, simplemente mostramos el valor
                  getKeyValue(item, columnKey)
                )}
              </TableCell>
            )}
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
