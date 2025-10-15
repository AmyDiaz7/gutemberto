"use client";

import type { Order } from "@/lib/types/database";

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
import { Pencil, Trash2, Eye } from "lucide-react";
import clsx from "clsx";

const columns = [
  { key: "id", label: "ID", width: "16%" },
  { key: "fecha", label: "Fecha", width: "28%" },
  { key: "cliente", label: "Cliente", width: "10%" },
  { key: "estado", label: "Estado", width: "10%" },
  { key: "metodoEntrega", label: "Método", width: "10%" },
  { key: "acciones", label: "Acciones", width: "26%" },
] as const;

type Props = {
  items: Order[];
  loading: boolean;
  sortDescriptor: SortDescriptor;
  onDelete?: (id: string) => void;
  onEdit?: (item: Order) => void;
  onViewDetails?: (item: Order) => void;
  onRowAction?: (key: string | number) => void;
  onSortChange: (d: SortDescriptor) => void;
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
        emptyContent="No se encontraron pedidos..."
        isLoading={loading}
        items={items}
        loadingContent={<Spinner label="Cargando..." />}
      >
        {(item: Order) => (
          <TableRow key={item.id}>
            {(columnKey) => (
              <TableCell>
                {columnKey === "acciones" ? (
                  <div className="flex gap-2">
                    <Button
                      isDisabled={loading}
                      size="sm"
                      variant="flat"
                      onPress={() => onViewDetails?.(item)}
                    >
                      <Eye size={14} /> Ver
                    </Button>
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
                      onPress={() => onDelete?.(item.id)}
                    >
                      <Trash2 size={14} /> Eliminar
                    </Button>
                  </div>
                ) : columnKey === "id" ? (
                  <div className="truncate max-w-[200px]" title={item.id}>
                    {item.id}
                  </div>
                ) : columnKey === "estado" ? (
                  <span
                    className={clsx(
                      "px-2 py-1 text-xs font-semibold rounded-full",
                      {
                        "bg-green-100 text-green-800":
                          item.estado === "entregado",
                        "bg-red-100 text-red-800": item.estado === "pendiente",
                        "bg-yellow-100 text-yellow-800":
                          item.estado === "bodega" ||
                          item.estado === "transportando",
                        "bg-blue-100 text-blue-800": item.estado === "pagado",
                      }
                    )}
                  >
                    {item.estado.charAt(0).toUpperCase() + item.estado.slice(1)}
                  </span>
                ) : columnKey === "metodoEntrega" ? (
                  <span className="px-2 py-1 text-xs font-semibold rounded-full">
                    {item.metodoEntrega.charAt(0).toUpperCase() +
                      item.metodoEntrega.slice(1)}
                  </span>
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
