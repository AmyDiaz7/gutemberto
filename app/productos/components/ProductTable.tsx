"use client";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  getKeyValue,
} from "@heroui/react";

const columns = [
  {
    key: "sku",
    label: "SKU",
  },
  {
    key: "nombre",
    label: "Nombre",
  },
  {
    key: "precio",
    label: "Precio",
  },
  {
    key: "stock",
    label: "Stock",
  },
];

export default function ProductTable({
  rows,
}: {
  rows: {
    sku: string;
    nombre: string;
    precio: number;
    stock: number;
  }[];
}) {
  return (
    <Table
      isHeaderSticky
      isStriped
      aria-label="Example table with dynamic content"
      selectionMode="single"
      onRowAction={(key) => alert(key)}
    >
      <TableHeader columns={columns}>
        {(column) => <TableColumn key={column.key}>{column.label}</TableColumn>}
      </TableHeader>
      <TableBody items={rows}>
        {(item) => (
          <TableRow key={item.sku}>
            {(columnKey) => (
              <TableCell>{getKeyValue(item, columnKey)}</TableCell>
            )}
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
