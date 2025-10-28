// Esta directiva indica que este componente se ejecuta en el navegador del cliente
"use client";

// ProductForm: Modal (ventana emergente) para crear o editar un producto.
// - Campos del formulario: SKU, Nombre, Precio, Stock, Categoría y Estado.
// - Validación automática con zod (verifica que los datos sean correctos).
// - Manejo del formulario con react-hook-form (gestiona el estado y validación).
// - Al enviar: hace POST (crear nuevo) o PATCH (editar existente) y cierra el modal si todo va bien.

// Importamos el tipo Product que define la estructura de un producto
import type { Product } from "@/lib/types/database";

// Importamos hooks de React para manejar efectos secundarios y estado local
import { useEffect, useState } from "react";
// Importamos componentes de interfaz de usuario
import {
  Button, // Botones del formulario
  Input, // Campos de entrada de texto y números
  Modal, // Contenedor del modal (ventana emergente)
  ModalBody, // Cuerpo del modal donde va el formulario
  ModalContent, // Envoltorio del contenido del modal
  ModalFooter, // Pie del modal donde van los botones
  ModalHeader, // Encabezado del modal con el título
  Select, // Campo de selección desplegable
  SelectItem, // Elemento individual del Select
} from "@heroui/react";
// Importamos utilidades de react-hook-form para manejar formularios
import {
  Controller, // Componente para conectar campos del formulario con react-hook-form
  useForm, // Hook principal para crear y manejar formularios
  type SubmitHandler, // Tipo para la función que maneja el envío del formulario
  type Resolver, // Tipo para el validador del formulario
} from "react-hook-form";
// Importamos zod para validación de esquemas (verifica tipos de datos)
import { z } from "zod";
// Importamos el adaptador que conecta zod con react-hook-form
import { zodResolver } from "@hookform/resolvers/zod";

// Definimos el tipo de propiedades que este componente recibirá
type Props = {
  initial?: Partial<Product>; // Datos iniciales del producto (opcional, usado en modo edición)
  isOpen: boolean; // Controla si el modal está visible o no
  mode: "create" | "edit"; // Modo del formulario: crear nuevo o editar existente
  onClose: () => void; // Función que se ejecuta al cerrar el modal
  onSaved?: (p: Product) => void; // Función que se ejecuta después de guardar exitosamente (opcional)
};

// Definimos las opciones del campo "estado" (status del producto)
const ESTADOS = [
  { key: "disponible", label: "Disponible" }, // Producto disponible para venta
  { key: "agotado", label: "Agotado" }, // Producto sin stock
  { key: "descontinuado", label: "Descontinuado" }, // Producto que ya no se vende
] as const; // 'as const' hace que sea de solo lectura (inmutable)

// Definimos el esquema de validación del formulario usando zod
const Schema = z.object({
  sku: z.string().min(1, "Requerido"), // SKU debe ser un texto con al menos 1 carácter
  nombre: z.string().min(1, "Requerido"), // Nombre debe ser un texto con al menos 1 carácter
  precio: z.coerce.number().nonnegative("No puede ser negativo"), // Precio: convierte a número y verifica que no sea negativo
  stock: z.coerce.number().int().nonnegative("No puede ser negativo"), // Stock: número entero no negativo
  categoria: z.string().min(1, "Requerido"), // Categoría debe ser un texto con al menos 1 carácter
  estado: z.enum(["disponible", "agotado", "descontinuado"]), // Estado solo puede ser uno de estos tres valores
});

// Tipo que representa los valores del formulario después de ser procesados por zod
type FormValues = z.output<typeof Schema>;

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

  // useEffect se ejecuta cuando el modal se abre o cambian los datos iniciales
  // Carga los datos iniciales en el formulario al abrir el modal
  useEffect(() => {
    if (!isOpen) return; // Si el modal no está abierto, no hace nada
    // Resetea el formulario con los valores iniciales (o valores vacíos si no hay)
    reset({
      sku: initial?.sku ?? "", // Usa el SKU inicial o string vacío
      nombre: initial?.nombre ?? "",
      precio: initial?.precio ?? 0,
      stock: initial?.stock ?? 0,
      categoria: initial?.categoria ?? "",
      estado: (initial?.estado as FormValues["estado"]) ?? "disponible",
    });
    setError(null); // Limpia cualquier error previo
  }, [isOpen, initial, reset]); // Se ejecuta cuando cambian estos valores

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
    // Componente Modal que crea la ventana emergente
    <Modal
      classNames={{
        wrapper: "items-end", // Alinea el modal al final (abajo) en móviles
        base: "w-full sm:max-w-2xl", // Ancho completo en móvil, máximo 2xl en pantallas grandes
      }}
      isOpen={isOpen} // Controla si el modal está visible
      placement="bottom-center" // Posición del modal
      scrollBehavior="inside" // El scroll es dentro del modal si el contenido es largo
      size="lg" // Tamaño grande
      onOpenChange={(open) => (!open ? onClose() : null)} // Cierra el modal si se intenta cerrar
    >
      <ModalContent>
        {/* Encabezado del modal con título dinámico */}
        <ModalHeader>
          {isEdit ? "Editar producto" : "Nuevo producto"}
        </ModalHeader>

        {/* Cuerpo del modal con el formulario */}
        <ModalBody>
          {/* Muestra mensaje de error si existe */}
          {error && <div className="text-danger text-sm">{error}</div>}

          {/* Formulario con diseño de cuadrícula (grid) */}
          <form
            className="grid grid-cols-1 md:grid-cols-2 gap-3" // 1 columna en móvil, 2 en pantallas medianas
            id="product-form" // ID del formulario para vincular con el botón submit
            onSubmit={handleSubmit(onSubmit)} // Maneja el envío del formulario
          >
            {/* Campo SKU - Controller conecta el campo con react-hook-form */}
            <Controller
              control={control} // Objeto de control del formulario
              name="sku" // Nombre del campo en el formulario
              // Función que renderiza el campo
              render={({ field }) => (
                <Input
                  errorMessage={errors.sku?.message} // Muestra mensaje de error si existe
                  isDisabled={isEdit} // Desactiva el campo si estamos editando (el SKU no se puede cambiar)
                  isInvalid={!!errors.sku} // Marca como inválido si hay error
                  label="SKU" // Etiqueta del campo
                  value={field.value} // Valor actual del campo
                  onChange={(e) => field.onChange(e.target.value)} // Actualiza el valor al cambiar
                />
              )}
            />

            {/* Campo Nombre */}
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

            {/* Campo Precio - tipo number */}
            <Controller
              control={control}
              name="precio"
              render={({ field }) => (
                <Input
                  errorMessage={errors.precio?.message}
                  isInvalid={!!errors.precio}
                  label="Precio"
                  type="number" // Input de tipo número
                  value={String(field.value)} // Convierte el número a string para el input
                  onChange={(e) => field.onChange(Number(e.target.value))} // Convierte de string a número
                />
              )}
            />

            {/* Campo Stock - tipo number */}
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

            {/* Campo Categoría */}
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

            {/* Campo Estado - Select desplegable */}
            <Controller
              control={control}
              name="estado"
              render={({ field }) => (
                <Select
                  errorMessage={errors.estado?.message}
                  isInvalid={!!errors.estado}
                  label="Estado"
                  selectedKeys={new Set([field.value || "disponible"])} // Valor seleccionado como Set
                  onSelectionChange={(keys) => {
                    // Cuando cambia la selección, obtiene el primer valor del Set
                    const first = Array.from(keys as Set<string>)[0];

                    field.onChange(first as FormValues["estado"]); // Actualiza el campo
                  }}
                >
                  {/* Mapea las opciones de estado */}
                  {ESTADOS.map((s) => (
                    <SelectItem key={s.key}>{s.label}</SelectItem>
                  ))}
                </Select>
              )}
            />
          </form>
        </ModalBody>

        {/* Pie del modal con botones de acción */}
        <ModalFooter>
          {/* Botón Cancelar */}
          <Button isDisabled={loading} variant="flat" onPress={onClose}>
            Cancelar
          </Button>
          {/* Botón Guardar/Crear */}
          <Button
            color="primary" // Color azul primario
            form="product-form" // Vincula con el formulario por su ID
            isDisabled={!isValid} // Desactiva si el formulario no es válido
            isLoading={loading} // Muestra spinner si está cargando
            type="submit" // Tipo submit para enviar el formulario
          >
            {isEdit ? "Guardar" : "Crear"} {/* Texto dinámico según el modo */}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
