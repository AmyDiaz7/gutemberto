"use client";

import type { Product } from "@/lib/types/database";

import {
  Button,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  getKeyValue,
  SortDescriptor,
} from "@heroui/react";
import { Pencil, Trash2 } from "lucide-react";
import clsx from "clsx";

const columns = [
  { key: "sku", label: "SKU", width: "16%" },
  { key: "nombre", label: "Nombre", width: "32%" },
  { key: "precio", label: "Precio", width: "10%" },
  { key: "stock", label: "Stock", width: "10%" },
  { key: "categoria", label: "Categoría", width: "12%" },
  { key: "estado", label: "Estado", width: "12%" },
  { key: "acciones", label: "Acciones", width: "18%" },
] as const;

type Props = {
  items: Product[];
  loading: boolean;
  sortDescriptor: SortDescriptor;
  onDelete?: (sku: string) => void;
  onEdit?: (item: Product) => void;
  onRowAction?: (key: string | number) => void;
  onSortChange: (d: SortDescriptor) => void;
};

export default function ProductDataTable({
  items,
  loading,
  onDelete,
  onEdit,
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
      onRowAction={(key) => onRowAction?.(String(key))}
      onSortChange={onSortChange}
    >
      <TableHeader columns={columns as any}>
        {(column: any) => (
          <TableColumn
            key={column.key}
            allowsSorting
            width={column.width as any}
          >
            {column.label}
          </TableColumn>
        )}
      </TableHeader>
      <TableBody
        emptyContent="No se encontraron productos..."
        isLoading={loading}
        items={items}
        loadingContent={<Spinner label="Cargando..." />}
      >
        {(item: Product) => (
          <TableRow key={item.sku}>
            {(columnKey) => (
              <TableCell>
                {columnKey === "acciones" ? (
                  <div className="flex gap-2">
                    <Button
                      isDisabled={loading}
                      size="sm"
                      variant="flat"
                      onPress={() => onEdit?.(item)}
                    >
                      <Pencil size={14} /> Editar
                    </Button>
                    <Button
                      color="danger"
                      isDisabled={loading}
                      size="sm"
                      variant="flat"
                      onPress={() => onDelete?.(item.sku)}
                    >
                      <Trash2 size={14} /> Eliminar
                    </Button>
                  </div>
                ) : columnKey === "estado" ? (
                  <span
                    className={clsx(
                      "px-2 py-1 text-xs font-semibold rounded-full",
                      {
                        "bg-green-100 text-green-800":
                          item.estado === "disponible",
                        "bg-red-100 text-red-800": item.estado === "agotado",
                        "bg-yellow-100 text-yellow-800":
                          item.estado === "descontinuado",
                      }
                    )}
                  >
                    {item.estado.charAt(0).toUpperCase() + item.estado.slice(1)}
                  </span>
                ) : columnKey === "precio" ? (
                  `$ ${getKeyValue(item, columnKey).toLocaleString("es-CO", {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })}`
                ) : (
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
