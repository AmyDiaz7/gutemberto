"use client";

// ProductForm: Modal simple para crear o editar un producto.
// - Campos: SKU, Nombre, Precio, Stock, Categoría y Estado.
// - Validación con zod y manejo de formulario con react-hook-form.
// - Enviar: POST (crear) o PATCH (editar) y cerrar el modal si todo va bien.

import type { Product } from "@/lib/types/database";

import { useEffect, useState } from "react";
import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
} from "@heroui/react";
import {
  Controller,
  useForm,
  type SubmitHandler,
  type Resolver,
} from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

// Props del componente
type Props = {
  initial?: Partial<Product>;
  isOpen: boolean;
  mode: "create" | "edit";
  onClose: () => void;
  onSaved?: (p: Product) => void;
};

// Opciones del campo "estado"
const ESTADOS = [
  { key: "disponible", label: "Disponible" },
  { key: "agotado", label: "Agotado" },
  { key: "descontinuado", label: "Descontinuado" },
] as const;

// Validación del formulario
const Schema = z.object({
  sku: z.string().min(1, "Requerido"),
  nombre: z.string().min(1, "Requerido"),
  precio: z.coerce.number().nonnegative("No puede ser negativo"),
  stock: z.coerce.number().int().nonnegative("No puede ser negativo"),
  categoria: z.string().min(1, "Requerido"),
  estado: z.enum(["disponible", "agotado", "descontinuado"]),
});

// Tipos de entrada/salida del esquema (zod v4)
type FormValues = z.output<typeof Schema>; // valores ya parseados por zod

export default function ProductForm({
  initial,
  isOpen,
  mode,
  onClose,
  onSaved,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEdit = mode === "edit";

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<z.input<typeof Schema>>({
    resolver: zodResolver(Schema) as unknown as Resolver<
      z.input<typeof Schema>
    >,
    mode: "onChange",
    defaultValues: {
      sku: "",
      nombre: "",
      precio: 0,
      stock: 0,
      categoria: "",
      estado: "disponible",
    } as any,
  });

  // Cargar datos iniciales al abrir
  useEffect(() => {
    if (!isOpen) return;
    reset({
      sku: initial?.sku ?? "",
      nombre: initial?.nombre ?? "",
      precio: initial?.precio ?? 0,
      stock: initial?.stock ?? 0,
      categoria: initial?.categoria ?? "",
      estado: (initial?.estado as FormValues["estado"]) ?? "disponible",
    });
    setError(null);
  }, [isOpen, initial, reset]);

  // Enviar al backend
  const onSubmit: SubmitHandler<z.input<typeof Schema>> = async (values) => {
    setLoading(true);
    setError(null);
    try {
      // Aseguramos tipos correctos (precio/stock como number)
      const parsed = Schema.parse(values) as FormValues;
      const payload: Product = { ...parsed } as Product;
      const url = isEdit
        ? `/api/products/${encodeURIComponent(payload.sku)}`
        : "/api/products";
      const method = isEdit ? "PATCH" : "POST";

      const body = isEdit
        ? (() => {
            const rest = { ...payload } as Record<string, unknown>;

            delete rest.sku; // no enviar sku en PATCH

            return JSON.stringify(rest);
          })()
        : JSON.stringify(payload);

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body,
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(json?.error || "Request failed");

      // Preferir el objeto devuelto por la API si existe
      const saved: Product = (json?.data as Product) || payload;

      onSaved?.(saved);
      onClose();
    } catch (e: any) {
      setError(e?.message || "Error guardando el producto");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      classNames={{
        wrapper: "items-center",
        base: "w-full sm:max-w-2xl",
      }}
      isOpen={isOpen}
      placement="center"
      scrollBehavior="inside"
      size="lg"
      onOpenChange={(open) => (!open ? onClose() : null)}
    >
      <ModalContent>
        <ModalHeader>
          {isEdit ? "Editar producto" : "Nuevo producto"}
        </ModalHeader>
        <ModalBody>
          {error && <div className="text-danger text-sm">{error}</div>}
          <form
            className="grid grid-cols-1 md:grid-cols-2 gap-3"
            id="product-form"
            onSubmit={handleSubmit(onSubmit)}
          >
            <Controller
              control={control}
              name="sku"
              render={({ field }) => (
                <Input
                  errorMessage={errors.sku?.message}
                  isDisabled={isEdit}
                  isInvalid={!!errors.sku}
                  label="SKU"
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                />
              )}
            />

            <Controller
              control={control}
              name="nombre"
              render={({ field }) => (
                <Input
                  errorMessage={errors.nombre?.message}
                  isInvalid={!!errors.nombre}
                  label="Nombre"
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                />
              )}
            />

            <Controller
              control={control}
              name="precio"
              render={({ field }) => (
                <Input
                  errorMessage={errors.precio?.message}
                  isInvalid={!!errors.precio}
                  label="Precio"
                  type="number"
                  value={String(field.value)}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              )}
            />

            <Controller
              control={control}
              name="stock"
              render={({ field }) => (
                <Input
                  errorMessage={errors.stock?.message}
                  isInvalid={!!errors.stock}
                  label="Stock"
                  type="number"
                  value={String(field.value)}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              )}
            />

            <Controller
              control={control}
              name="categoria"
              render={({ field }) => (
                <Input
                  errorMessage={errors.categoria?.message}
                  isInvalid={!!errors.categoria}
                  label="Categoría"
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                />
              )}
            />

            <Controller
              control={control}
              name="estado"
              render={({ field }) => (
                <Select
                  errorMessage={errors.estado?.message}
                  isInvalid={!!errors.estado}
                  label="Estado"
                  selectedKeys={new Set([field.value || "disponible"])}
                  onSelectionChange={(keys) => {
                    const first = Array.from(keys as Set<string>)[0];

                    field.onChange(first as FormValues["estado"]);
                  }}
                >
                  {ESTADOS.map((s) => (
                    <SelectItem key={s.key}>{s.label}</SelectItem>
                  ))}
                </Select>
              )}
            />
          </form>
        </ModalBody>
        <ModalFooter>
          <Button isDisabled={loading} variant="flat" onPress={onClose}>
            Cancelar
          </Button>
          <Button
            color="primary"
            form="product-form"
            isDisabled={!isValid}
            isLoading={loading}
            type="submit"
          >
            {isEdit ? "Guardar" : "Crear"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
