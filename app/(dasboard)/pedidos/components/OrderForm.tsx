// Indicamos que este componente se ejecuta en el navegador (lado del cliente)
"use client";

// Importamos el tipo Order que define la estructura de un pedido
import type { Order } from "@/lib/types/database";

// Importamos hooks de React para manejar efectos y estado
import { useEffect, useState } from "react";
// Importamos componentes de HeroUI para construir el formulario en un modal
import {
  Button, // Botones de acción
  Input, // Campos de entrada de texto
  Modal, // Contenedor del modal
  ModalBody, // Cuerpo del modal
  ModalContent, // Wrapper del contenido
  ModalFooter, // Pie del modal con botones
  ModalHeader, // Encabezado del modal
  Select, // Selector desplegable
  SelectItem, // Item individual del selector
} from "@heroui/react";
// Importamos utilidades de react-hook-form para gestionar formularios
import {
  Controller, // Conecta campos del formulario con react-hook-form
  useForm, // Hook principal para manejar formularios
  type SubmitHandler, // Tipo para la función que procesa el envío
  type Resolver, // Tipo para el validador
} from "react-hook-form";
// Importamos zod para validación de datos
import { z } from "zod";
// Importamos el adaptador que conecta zod con react-hook-form
import { zodResolver } from "@hookform/resolvers/zod";

// Definimos el tipo de las propiedades que recibe este componente
type Props = {
  initial?: Partial<Order>; // Datos iniciales del pedido (opcional, para edición)
  isOpen: boolean; // Controla si el modal está visible
  mode: "create" | "edit"; // Modo: crear nuevo pedido o editar existente
  onClose: () => void; // Función que se ejecuta al cerrar el modal
  onSaved?: (p: Order) => void; // Función opcional que se ejecuta al guardar exitosamente
};

// Array con las opciones disponibles para el campo "estado"
const ESTADOS = [
  { key: "pendiente", label: "Pendiente" },
  { key: "pagado", label: "Pagado" },
  { key: "bodega", label: "Bodega" },
  { key: "transportando", label: "Transportando" },
  { key: "entregado", label: "Entregado" },
] as const; // 'as const' hace que los valores sean inmutables

// Array con las opciones disponibles para el campo "método de entrega"
const METODOS = [
  { key: "recoger", label: "Recoger" },
  { key: "domicilio", label: "Domicilio" },
] as const;

// Esquema de validación con zod - define las reglas que debe cumplir el formulario
const Schema = z.object({
  id: z.string().min(1, "ID es requerido"), // ID: texto obligatorio (mínimo 1 carácter)
  fecha: z.string().min(1, "Fecha es requerida"), // Fecha: texto obligatorio
  cliente: z.string().min(1, "Cliente es requerido"), // Cliente: texto obligatorio
  estado: z.enum([
    // Estado: debe ser uno de estos valores específicos
    "pendiente",
    "pagado",
    "bodega",
    "transportando",
    "entregado",
  ]),
  metodoEntrega: z.enum(["recoger", "domicilio"]), // Método: solo "recoger" o "domicilio"
});

// Tipo que representa los valores del formulario después de ser validados por zod
type FormValues = z.output<typeof Schema>;

/**
 * Componente de formulario para crear o editar pedidos
 * Muestra un modal con campos para ID, fecha, cliente, estado y método de entrega
 * Valida los datos antes de enviarlos a la API
 */
export default function ProductForm({
  initial, // Datos iniciales (si es edición)
  isOpen, // Si el modal está abierto
  mode, // "create" o "edit"
  onClose, // Función para cerrar el modal
  onSaved, // Función que se ejecuta tras guardar exitosamente
}: Props) {
  // Estado para indicar si está guardando (enviando datos a la API)
  const [loading, setLoading] = useState(false);
  // Estado para almacenar mensajes de error
  const [error, setError] = useState<string | null>(null);
  // Variable auxiliar que indica si estamos en modo edición
  const isEdit = mode === "edit";

  // Configuramos react-hook-form para gestionar el formulario
  const {
    control, // Objeto para conectar campos con Controller
    handleSubmit, // Función que procesa el envío del formulario
    reset, // Función para reiniciar los valores del formulario
    formState: { errors, isValid }, // Estado del formulario (errores, si es válido)
  } = useForm<z.input<typeof Schema>>({
    resolver: zodResolver(Schema) as unknown as Resolver<
      z.input<typeof Schema>
    >, // Usa zod para validar
    mode: "onChange", // Valida mientras el usuario escribe
    defaultValues: {
      // Valores por defecto del formulario
      id: "",
      fecha: "",
      cliente: "",
      estado: "pendiente",
      metodoEntrega: "recoger",
    } as any,
  });

  /**
   * Effect que se ejecuta cuando el modal se abre o cambian los datos iniciales
   * Carga los datos iniciales en el formulario (útil para modo edición)
   */
  useEffect(() => {
    if (!isOpen) return; // Si el modal no está abierto, no hacemos nada

    // Reiniciamos el formulario con los valores iniciales o valores vacíos
    reset({
      id: initial?.id ?? "", // Usa el ID inicial o string vacío
      fecha: initial?.fecha ?? "",
      cliente: initial?.cliente ?? "",
      estado: (initial?.estado as FormValues["estado"]) ?? "pendiente",
      metodoEntrega:
        (initial?.metodoEntrega as FormValues["metodoEntrega"]) ?? "recoger",
    });
    setError(null); // Limpiamos cualquier error previo
  }, [isOpen, initial, reset]); // Se ejecuta cuando cambian estos valores

  /**
   * Función que se ejecuta cuando el usuario envía el formulario
   * Valida los datos y los envía a la API (POST para crear, PATCH para editar)
   */
  const onSubmit: SubmitHandler<z.input<typeof Schema>> = async (values) => {
    setLoading(true); // Activamos el estado de carga
    setError(null); // Limpiamos errores previos
    try {
      // Validamos y parseamos los datos con zod
      const parsed = Schema.parse(values) as FormValues;
      const payload: Order = { ...parsed } as Order;

      // Determinamos la URL y método HTTP según el modo
      const url = isEdit
        ? `/api/orders/${encodeURIComponent(payload.id)}` // PATCH a /api/orders/:id
        : "/api/orders"; // POST a /api/orders
      const method = isEdit ? "PATCH" : "POST";

      // En modo edición, no enviamos el ID en el body (solo en la URL)
      const body = isEdit
        ? (() => {
            const rest = { ...payload } as Record<string, unknown>;

            delete rest.id; // Eliminamos el ID del objeto

            return JSON.stringify(rest);
          })()
        : JSON.stringify(payload); // En modo crear, enviamos todo

      // Hacemos la petición HTTP a la API
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body,
      });

      // Intentamos parsear la respuesta como JSON
      const json = await res.json().catch(() => ({}));

      // Si la respuesta no es exitosa, lanzamos un error
      if (!res.ok) throw new Error(json?.error || "Request failed");

      // Obtenemos el pedido guardado (preferimos el que devuelve la API)
      const saved: Order = (json?.data as Order) || payload;

      // Ejecutamos el callback con el pedido guardado
      onSaved?.(saved);
      // Cerramos el modal
      onClose();
    } catch (e: any) {
      // Si hay error, lo guardamos para mostrarlo al usuario
      setError(e?.message || "Error guardando el pedido");
    } finally {
      setLoading(false); // Desactivamos el estado de carga
    }
  };

  return (
    // Modal que contiene el formulario
    <Modal
      classNames={{
        wrapper: "items-end", // Alinea el modal al final (abajo) en móvil
        base: "w-full sm:max-w-2xl", // Ancho completo en móvil, máximo 2xl en pantallas grandes
      }}
      isOpen={isOpen} // Controla si está visible
      placement="bottom-center" // Posición: centro inferior
      scrollBehavior="inside" // El scroll se aplica dentro del modal
      size="lg" // Tamaño grande
      onOpenChange={(open) => (!open ? onClose() : null)} // Cierra al cambiar a false
    >
      <ModalContent>
        {/* Encabezado del modal con título dinámico */}
        <ModalHeader>{isEdit ? "Editar pedido" : "Nuevo pedido"}</ModalHeader>
        <ModalBody>
          {/* Muestra mensaje de error si existe */}
          {error && <div className="text-danger text-sm">{error}</div>}

          {/* Formulario con layout de cuadrícula (1 columna en móvil, 2 en desktop) */}
          <form
            className="grid grid-cols-1 md:grid-cols-2 gap-3"
            id="product-form"
            onSubmit={handleSubmit(onSubmit)} // Conecta el submit con nuestra función
          >
            {/* Campo ID - Controller conecta el Input con react-hook-form */}
            <Controller
              control={control} // Objeto de control del formulario
              name="id" // Nombre del campo en el formulario
              render={({ field }) => (
                <Input
                  errorMessage={errors.id?.message} // Mensaje de error si existe
                  isDisabled={isEdit} // Deshabilitado en modo edición (no se puede cambiar el ID)
                  isInvalid={!!errors.id} // Marca como inválido si hay error
                  label="ID"
                  value={field.value} // Valor actual del campo
                  onChange={(e) => field.onChange(e.target.value)} // Actualiza el valor
                />
              )}
            />

            {/* Campo Fecha - tipo datetime-local para seleccionar fecha y hora */}
            <Controller
              control={control}
              name="fecha"
              render={({ field }) => (
                <Input
                  errorMessage={errors.fecha?.message}
                  isInvalid={!!errors.fecha}
                  label="Fecha"
                  type="datetime-local" // Tipo especial para fecha + hora
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                />
              )}
            />

            {/* Campo Cliente - ID del cliente que hace el pedido */}
            <Controller
              control={control}
              name="cliente"
              render={({ field }) => (
                <Input
                  errorMessage={errors.cliente?.message}
                  isInvalid={!!errors.cliente}
                  label="Cliente"
                  type="text"
                  value={String(field.value)} // Convertimos a string
                  onChange={(e) => field.onChange(e.target.value)}
                />
              )}
            />

            {/* Selector de Estado - dropdown con las opciones de ESTADOS */}
            <Controller
              control={control}
              name="estado"
              render={({ field }) => (
                <Select
                  errorMessage={errors.estado?.message}
                  isInvalid={!!errors.estado}
                  label="Estado"
                  selectedKeys={new Set([field.value || "pendiente"])} // Set con el valor seleccionado
                  onSelectionChange={(keys) => {
                    // Obtenemos el primer elemento del Set de seleccionados
                    const first = Array.from(keys as Set<string>)[0];

                    field.onChange(first as FormValues["estado"]); // Actualizamos el campo
                  }}
                >
                  {/* Mapeamos las opciones de ESTADOS */}
                  {ESTADOS.map((s) => (
                    <SelectItem key={s.key}>{s.label}</SelectItem>
                  ))}
                </Select>
              )}
            />

            {/* Selector de Método de Entrega - dropdown con las opciones de METODOS */}
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
                  {/* Mapeamos las opciones de METODOS */}
                  {METODOS.map((s) => (
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
          {/* Botón Guardar/Crear - asociado al formulario por el atributo 'form' */}
          <Button
            color="primary"
            form="product-form" // Se asocia al form con id="product-form"
            isDisabled={!isValid} // Deshabilitado si el formulario no es válido
            isLoading={loading} // Muestra spinner mientras guarda
            type="submit" // Tipo submit para enviar el formulario
          >
            {isEdit ? "Guardar" : "Crear"} {/* Texto dinámico según el modo */}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
