"use client";

import type { Product } from "@/lib/types/database";

import {
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
import clsx from "clsx";

const columns = [
  { key: "sku", label: "SKU", width: "20%" },
  { key: "nombre", label: "Nombre", width: "35%" },
  { key: "precio", label: "Precio", width: "10%" },
  { key: "stock", label: "Stock", width: "10%" },
  { key: "categoria", label: "Categoría", width: "10%" },
  { key: "estado", label: "Estado", width: "15%" },
] as const;

type Props = {
  items: Product[];
  loading: boolean;
  sortDescriptor: SortDescriptor;
  onSortChange: (d: SortDescriptor) => void;
  onRowAction?: (key: string | number) => void;
};

export default function ProductDataTable({
  items,
  loading,
  onRowAction,
  onSortChange,
  sortDescriptor,
}: Props) {
  return (
    <div className="w-full overflow-x-auto pt-2">
      <Table
        isHeaderSticky
        isStriped
        aria-label="Tabla de productos"
        className="min-w-[720px]"
        classNames={{
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
                  {columnKey === "estado" ? (
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
                      {item.estado.charAt(0).toUpperCase() +
                        item.estado.slice(1)}
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
    </div>
  );
}
