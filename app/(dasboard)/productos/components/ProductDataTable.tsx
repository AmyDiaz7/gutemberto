// Esta directiva indica que este componente se ejecuta en el navegador del cliente
"use client";

// Importamos el tipo Product que define la estructura de un producto
import type { Product } from "@/lib/types/database";

// Importamos los componentes de tabla y utilidades de HeroUI
import {
  Button, // Botón para acciones
  Spinner, // Indicador de carga
  Table, // Componente principal de tabla
  TableBody, // Cuerpo de la tabla (filas de datos)
  TableCell, // Celda individual de la tabla
  TableColumn, // Columna de la tabla (encabezado)
  TableHeader, // Encabezado de la tabla
  TableRow, // Fila de la tabla
  getKeyValue, // Función helper para obtener valores de objetos
  SortDescriptor, // Tipo para describir el ordenamiento
} from "@heroui/react";
// Importamos íconos para los botones de editar y eliminar
import { Pencil, Trash2 } from "lucide-react";
// Importamos clsx para combinar clases CSS condicionalmente
import clsx from "clsx";

// Definimos las columnas de la tabla con sus configuraciones
const columns = [
  { key: "sku", label: "SKU", width: "16%" }, // Código único del producto
  { key: "nombre", label: "Nombre", width: "32%" }, // Nombre del producto
  { key: "precio", label: "Precio", width: "10%" }, // Precio del producto
  { key: "stock", label: "Stock", width: "10%" }, // Cantidad disponible
  { key: "categoria", label: "Categoría", width: "12%" }, // Categoría del producto
  { key: "estado", label: "Estado", width: "12%" }, // Estado (disponible, agotado, etc.)
  { key: "acciones", label: "Acciones", width: "18%" }, // Botones de acción
] as const; // 'as const' hace que el array sea de solo lectura

// Definimos el tipo de propiedades que este componente recibirá
type Props = {
  items: Product[]; // Array de productos a mostrar en la tabla
  loading: boolean; // Indica si los datos están cargando
  sortDescriptor: SortDescriptor; // Describe cómo está ordenada la tabla
  onDelete?: (sku: string) => void; // Función que se ejecuta al eliminar (opcional)
  onEdit?: (item: Product) => void; // Función que se ejecuta al editar (opcional)
  onRowAction?: (key: string | number) => void; // Función que se ejecuta al hacer clic en una fila (opcional)
  onSortChange: (d: SortDescriptor) => void; // Función que se ejecuta al cambiar el ordenamiento
};

// Componente principal que renderiza la tabla de productos
export default function ProductDataTable({
  items, // Productos a mostrar
  loading, // Estado de carga
  onDelete, // Manejador para eliminar
  onEdit, // Manejador para editar
  onRowAction, // Manejador para clic en fila
  onSortChange, // Manejador para cambio de ordenamiento
  sortDescriptor, // Descriptor del ordenamiento actual
}: Props) {
  return (
    // Componente Table principal
    <Table
      isHeaderSticky // Mantiene el encabezado fijo al hacer scroll
      isStriped // Alterna colores en las filas para mejor legibilidad
      aria-label="Tabla de productos" // Etiqueta para accesibilidad
      classNames={{
        wrapper: "w-full overflow-x-auto pt-2", // Contenedor con scroll horizontal
        table: "min-w-[720px]", // Ancho mínimo de la tabla
        td: clsx("transition-opacity", { "opacity-30": loading }), // Las celdas se atenúan al cargar
      }}
      selectionMode="single" // Permite seleccionar una fila a la vez
      sortDescriptor={sortDescriptor} // Estado actual del ordenamiento
      onRowAction={(key) => onRowAction?.(String(key))} // Ejecuta acción al hacer clic en una fila
      onSortChange={onSortChange}
    >
      {/* TableHeader define el encabezado de la tabla */}
      <TableHeader columns={columns as any}>
        {/* Renderiza una columna por cada elemento en el array 'columns' */}
        {(column: any) => (
          <TableColumn
            key={column.key} // Identificador único para React
            allowsSorting // Permite ordenar por esta columna
            width={column.width as any} // Ancho de la columna
          >
            {column.label} {/* Texto que se muestra en el encabezado */}
          </TableColumn>
        )}
      </TableHeader>
      {/* TableBody define el cuerpo de la tabla con todas las filas de datos */}
      <TableBody
        emptyContent="No se encontraron productos..." // Mensaje cuando no hay datos
        isLoading={loading} // Indica si está cargando
        items={items} // Array de productos a renderizar
        loadingContent={<Spinner label="Cargando..." />} // Contenido mostrado durante la carga
      >
        {/* Renderiza una fila por cada producto */}
        {(item: Product) => (
          // Cada fila tiene un identificador único (SKU)
          <TableRow key={item.sku}>
            {/* Renderiza una celda por cada columna */}
            {(columnKey) => (
              // Celda individual de la tabla
              <TableCell>
                {/* Determinamos qué mostrar según la columna */}
                {columnKey === "acciones" ? (
                  // Si es la columna de acciones, mostramos los botones de editar y eliminar
                  <div className="flex gap-2">
                    {/* Botón de Editar */}
                    <Button
                      isDisabled={loading} // Desactiva si está cargando
                      size="sm" // Tamaño pequeño
                      variant="flat" // Estilo plano
                      onPress={() => onEdit?.(item)} // Llama a la función de editar con el producto
                    >
                      <Pencil size={14} /> Editar
                    </Button>
                    {/* Botón de Eliminar */}
                    <Button
                      color="danger" // Color rojo para acción peligrosa
                      isDisabled={loading} // Desactiva si está cargando
                      size="sm" // Tamaño pequeño
                      variant="flat" // Estilo plano
                      onPress={() => onDelete?.(item.sku)} // Llama a la función de eliminar con el SKU
                    >
                      <Trash2 size={14} /> Eliminar
                    </Button>
                  </div>
                ) : columnKey === "estado" ? (
                  // Si es la columna de estado, mostramos un badge con color según el estado
                  <span
                    className={clsx(
                      "px-2 py-1 text-xs font-semibold rounded-full", // Clases base del badge
                      {
                        // Clases condicionales según el estado del producto
                        "bg-green-100 text-green-800":
                          item.estado === "disponible", // Verde si está disponible
                        "bg-red-100 text-red-800": item.estado === "agotado", // Rojo si está agotado
                        "bg-yellow-100 text-yellow-800":
                          item.estado === "descontinuado", // Amarillo si está descontinuado
                      }
                    )}
                  >
                    {/* Capitaliza la primera letra del estado */}
                    {item.estado.charAt(0).toUpperCase() + item.estado.slice(1)}
                  </span>
                ) : columnKey === "precio" ? (
                  // Si es la columna de precio, formateamos el número con separadores de miles
                  `$ ${getKeyValue(item, columnKey).toLocaleString("es-CO", {
                    minimumFractionDigits: 0, // No mostrar decimales
                    maximumFractionDigits: 0, // No mostrar decimales
                  })}`
                ) : (
                  // Para cualquier otra columna, simplemente mostramos el valor directamente
                  getKeyValue(item, columnKey) // Obtiene el valor del producto usando la clave de la columna
                )}
              </TableCell>
            )}
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
