"use client";

import type { Order } from "@/lib/types/database";

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
  initial?: Partial<Order>;
  isOpen: boolean;
  mode: "create" | "edit";
  onClose: () => void;
  onSaved?: (p: Order) => void;
};

// Opciones del campo "estado"
const ESTADOS = [
  { key: "pendiente", label: "Pendiente" },
  { key: "pagado", label: "Pagado" },
  { key: "bodega", label: "Bodega" },
  { key: "transportando", label: "Transportando" },
  { key: "entregado", label: "Entregado" },
] as const;

const METODOS = [
  { key: "recoger", label: "Recoger" },
  { key: "domicilio", label: "Domicilio" },
] as const;

// Validación del formulario
const Schema = z.object({
  id: z.string().min(1, "ID es requerido"),
  fecha: z.string().min(1, "Fecha es requerida"),
  cliente: z.string().min(1, "Cliente es requerido"),
  estado: z.enum([
    "pendiente",
    "pagado",
    "bodega",
    "transportando",
    "entregado",
  ]),
  metodoEntrega: z.enum(["recoger", "domicilio"]),
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
      id: "",
      fecha: "",
      cliente: "",
      estado: "pendiente",
      metodoEntrega: "recoger",
    } as any,
  });

  // Cargar datos iniciales al abrir
  useEffect(() => {
    if (!isOpen) return;
    reset({
      id: initial?.id ?? "",
      fecha: initial?.fecha ?? "",
      cliente: initial?.cliente ?? "",
      estado: (initial?.estado as FormValues["estado"]) ?? "pendiente",
      metodoEntrega:
        (initial?.metodoEntrega as FormValues["metodoEntrega"]) ?? "recoger",
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
      const payload: Order = { ...parsed } as Order;
      const url = isEdit
        ? `/api/orders/${encodeURIComponent(payload.id)}`
        : "/api/orders";
      const method = isEdit ? "PATCH" : "POST";

      const body = isEdit
        ? (() => {
            const rest = { ...payload } as Record<string, unknown>;

            delete rest.id; // no enviar id en PATCH

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
      const saved: Order = (json?.data as Order) || payload;

      onSaved?.(saved);
      onClose();
    } catch (e: any) {
      setError(e?.message || "Error guardando el pedido");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      classNames={{
        wrapper: "items-end",
        base: "w-full sm:max-w-2xl",
      }}
      isOpen={isOpen}
      placement="bottom-center"
      scrollBehavior="inside"
      size="lg"
      onOpenChange={(open) => (!open ? onClose() : null)}
    >
      <ModalContent>
        <ModalHeader>{isEdit ? "Editar pedido" : "Nuevo pedido"}</ModalHeader>
        <ModalBody>
          {error && <div className="text-danger text-sm">{error}</div>}
          <form
            className="grid grid-cols-1 md:grid-cols-2 gap-3"
            id="product-form"
            onSubmit={handleSubmit(onSubmit)}
          >
            <Controller
              control={control}
              name="id"
              render={({ field }) => (
                <Input
                  errorMessage={errors.id?.message}
                  isDisabled={isEdit}
                  isInvalid={!!errors.id}
                  label="ID"
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                />
              )}
            />

            <Controller
              control={control}
              name="fecha"
              render={({ field }) => (
                <Input
                  errorMessage={errors.fecha?.message}
                  isInvalid={!!errors.fecha}
                  label="Fecha"
                  type="datetime-local"
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                />
              )}
            />

            <Controller
              control={control}
              name="cliente"
              render={({ field }) => (
                <Input
                  errorMessage={errors.cliente?.message}
                  isInvalid={!!errors.cliente}
                  label="Cliente"
                  type="text"
                  value={String(field.value)}
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
                  selectedKeys={new Set([field.value || "pendiente"])}
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

            <Controller
              control={control}
              name="metodoEntrega"
              render={({ field }) => (
                <Select
                  errorMessage={errors.metodoEntrega?.message}
                  isInvalid={!!errors.metodoEntrega}
                  label="Método"
                  selectedKeys={new Set([field.value || "recoger"])}
                  onSelectionChange={(keys) => {
                    const first = Array.from(keys as Set<string>)[0];

                    field.onChange(first as FormValues["metodoEntrega"]);
                  }}
                >
                  {METODOS.map((s) => (
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
