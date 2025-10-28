// Indicamos que este componente se ejecuta en el navegador (lado del cliente)
"use client";

// Importamos los tipos que definen la estructura de un pedido y sus detalles
import type { Order, OrderDetail } from "@/lib/types/database";

// Importamos componentes de la librería HeroUI para crear el modal y sus elementos
import {
  Modal, // Contenedor principal del modal
  ModalContent, // Wrapper del contenido
  ModalHeader, // Encabezado del modal
  ModalBody, // Cuerpo del modal con el contenido principal
  ModalFooter, // Pie del modal con los botones
  Button, // Botones de acción
  Spinner, // Animación de carga
  Chip, // Etiquetas visuales (badges)
  Divider, // Línea divisoria
  Skeleton, // Animación de carga para contenido
  Select, // Selector desplegable
  SelectItem, // Item individual del selector
} from "@heroui/react";
// Importamos hooks de React para manejar efectos y estado
import { useEffect, useState } from "react";
// Importamos clsx para manejar clases CSS condicionales
import clsx from "clsx";

// Importamos el componente editor de productos para modo edición
import OrderProductsEditorLocal from "./OrderProductsEditorLocal";

// Definimos el tipo de las propiedades que recibe este componente
type Props = {
  isOpen: boolean; // Controla si el modal está visible o no
  order: Order | null; // El pedido a mostrar (puede ser null si no hay pedido seleccionado)
  onClose: () => void; // Función que se ejecuta al cerrar el modal
  editable?: boolean; // Si es true, permite editar el pedido y sus productos
};

// Diccionario con los nombres legibles de cada estado de pedido
const statusLabels: Record<string, string> = {
  pendiente: "Pendiente",
  pagado: "Pagado",
  bodega: "Bodega",
  transportando: "Transportando",
  entregado: "Entregado",
};

// Diccionario con los nombres legibles de cada método de entrega
const methodLabels: Record<string, string> = {
  recoger: "Recoger",
  domicilio: "Domicilio",
};

/**
 * Componente modal para mostrar los detalles completos de un pedido
 * Permite ver información del pedido, cliente, productos y totales
 * En modo editable, permite modificar el estado, método y productos del pedido
 */
export default function OrderDetailsModal({
  isOpen,
  order,
  onClose,
  editable = false, // Por defecto es false (solo lectura)
}: Props) {
  // Estado para almacenar los detalles (productos) del pedido
  const [orderDetails, setOrderDetails] = useState<OrderDetail[]>([]);
  // Estado para almacenar el pedido enriquecido con datos adicionales (ej: nombre del cliente)
  const [enrichedOrder, setEnrichedOrder] = useState<Order | null>(null);
  // Estado para indicar si está cargando los datos del pedido
  const [loading, setLoading] = useState(false);
  // Estado para indicar si está guardando los cambios
  const [saving, setSaving] = useState(false);

  // Estados para editar el pedido (solo se usan en modo editable)
  const [editedEstado, setEditedEstado] =
    useState<Order["estado"]>("pendiente"); // Estado editado del pedido
  const [editedMetodo, setEditedMetodo] =
    useState<Order["metodoEntrega"]>("recoger"); // Método de entrega editado

  // Estado local para los cambios en productos (solo en modo edición)
  const [localDetails, setLocalDetails] = useState<OrderDetail[]>([]);

  const fetchOrderDetails = async () => {
    if (!order) return;

    setLoading(true);
    try {
      // Fetch order details from API
      const response = await fetch(
        `/api/orders/${encodeURIComponent(order.id)}`
      );

      if (response.ok) {
        const data = await response.json();

        // Debug: log the response
        // eslint-disable-next-line no-console
        console.log("API Response:", data);
        // eslint-disable-next-line no-console
        console.log("Details:", data.details);
        // eslint-disable-next-line no-console
        console.log("Order data:", data.data);
        // eslint-disable-next-line no-console
        console.log("Client name:", data.data?.nombreCliente);

        // Update order with enriched data and details
        setEnrichedOrder(data.data || null);
        setOrderDetails(data.details || []);

        // Inicializar estados de edición
        if (data.data) {
          setEditedEstado(data.data.estado);
          setEditedMetodo(data.data.metodoEntrega);
        }

        // Inicializar detalles locales si está en modo edición
        if (editable) {
          setLocalDetails(data.details || []);
        }
      }
    } catch (error) {
      // Handle error silently
    } finally {
      setLoading(false);
    }
  };

  /**
   * Effect hook que se ejecuta cuando cambia isOpen u order
   * Si el modal se abre y hay un pedido, carga sus detalles
   * Si el modal se cierra, limpia los datos
   */
  useEffect(() => {
    if (isOpen && order) {
      fetchOrderDetails(); // Cargamos los detalles del pedido
    } else {
      // Limpiamos los estados cuando se cierra el modal
      setOrderDetails([]);
      setEnrichedOrder(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, order]); // Se ejecuta cuando cambian isOpen u order

  /**
   * Función asíncrona que guarda todos los cambios realizados en el pedido
   * Actualiza el estado/método del pedido y gestiona cambios en productos
   * (agregar, eliminar o actualizar cantidades)
   */
  const handleSave = async () => {
    if (!displayOrder) return; // Si no hay pedido a guardar, salimos

    setSaving(true); // Activamos el estado de guardado
    try {
      // 1. Guardamos cambios del pedido (estado y método de entrega)
      const orderResponse = await fetch(
        `/api/orders/${encodeURIComponent(displayOrder.id)}`,
        {
          method: "PATCH", // PATCH se usa para actualizar parcialmente
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            estado: editedEstado,
            metodoEntrega: editedMetodo,
          }),
        }
      );

      if (!orderResponse.ok) {
        const error = await orderResponse.json();

        throw new Error(error.error || "Error al guardar cambios del pedido");
      }

      // 2. Procesamos cambios en productos
      // Identificamos productos a eliminar (los que estaban pero ya no están en localDetails)
      const productsToDelete = orderDetails.filter(
        (original) => !localDetails.find((local) => local.id === original.id)
      );

      // Identificamos productos a agregar (los que tienen ID temporal: "temp-...")
      const productsToAdd = localDetails.filter((detail) =>
        detail.id.startsWith("temp-")
      );

      // Identificamos productos a actualizar (los que cambiaron de cantidad)
      const productsToUpdate = localDetails.filter((local) => {
        const original = orderDetails.find((o) => o.id === local.id);

        return original && original.cantidad !== local.cantidad;
      });

      // Ejecutamos las eliminaciones de productos
      for (const product of productsToDelete) {
        const response = await fetch(
          `/api/orders/${displayOrder.id}/details/${product.id}`,
          { method: "DELETE" } // DELETE para eliminar
        );

        if (!response.ok) {
          throw new Error(`Error al eliminar producto ${product.producto}`);
        }
      }

      // Ejecutamos las adiciones de productos
      for (const product of productsToAdd) {
        const response = await fetch(`/api/orders/${displayOrder.id}/details`, {
          method: "POST", // POST para crear nuevo registro
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            producto: product.producto,
            cantidad: product.cantidad,
          }),
        });

        if (!response.ok) {
          const error = await response.json();

          throw new Error(
            error.error || `Error al agregar producto ${product.producto}`
          );
        }
      }

      // Ejecutamos las actualizaciones de cantidades
      for (const product of productsToUpdate) {
        const response = await fetch(
          `/api/orders/${displayOrder.id}/details/${product.id}`,
          {
            method: "PATCH", // PATCH para actualizar
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              cantidad: product.cantidad,
            }),
          }
        );

        if (!response.ok) {
          const error = await response.json();

          throw new Error(
            error.error || `Error al actualizar producto ${product.producto}`
          );
        }
      }

      // Si todo salió bien, cerramos el modal
      onClose();
    } catch (error: any) {
      // Si hay algún error, mostramos un alert al usuario
      alert(error.message);
    } finally {
      setSaving(false); // Desactivamos el estado de guardado
    }
  };

  // Si no hay pedido, no renderizamos nada
  if (!order) return null;

  // Usamos el pedido enriquecido si está disponible, si no, usamos el original
  const displayOrder = enrichedOrder || order;

  /**
   * Función auxiliar que formatea una fecha en formato legible en español
   * Ejemplo: "15 de enero de 2025, 14:30"
   */
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);

    return date.toLocaleString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  /**
   * Función auxiliar que formatea un número como moneda colombiana
   * Ejemplo: 50000 -> "$50.000"
   */
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  /**
   * Función que calcula el total del pedido sumando todos los productos
   * Total = Suma de (precio unitario × cantidad) de cada producto
   */
  const calculateTotal = () => {
    return orderDetails.reduce((total, detail) => {
      const precio = detail.precio || 0;
      const cantidad = detail.cantidad || 0;

      return total + precio * cantidad;
    }, 0); // Empezamos desde 0
  };

  return (
    <Modal isOpen={isOpen} scrollBehavior="inside" size="2xl" onClose={onClose}>
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <h2 className="text-xl font-bold">Detalles del Pedido</h2>
          <p className="text-sm text-default-500 font-normal">
            ID: {displayOrder.id}
          </p>
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            {/* Order Information */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-default-500 mb-1">Fecha</p>
                <p className="font-medium">{formatDate(displayOrder.fecha)}</p>
              </div>
              <div>
                <p className="text-sm text-default-500 mb-1">Cliente</p>
                {loading || !enrichedOrder ? (
                  <Skeleton className="h-6 w-48 rounded-lg" />
                ) : (
                  <>
                    <p className="font-medium">
                      {displayOrder.nombreCliente || displayOrder.cliente}
                    </p>
                    {displayOrder.nombreCliente && (
                      <p className="text-xs text-default-400">
                        ID: {displayOrder.cliente}
                      </p>
                    )}
                  </>
                )}
              </div>
              {/* Estado del pedido con chip de color */}
              <div>
                <p className="text-sm text-default-500 mb-1">Estado</p>
                {/* Chip con color según el estado */}
                <Chip
                  className={clsx("font-semibold", {
                    "bg-green-100 text-green-800":
                      displayOrder.estado === "entregado",
                    "bg-red-100 text-red-800":
                      displayOrder.estado === "pendiente",
                    "bg-yellow-100 text-yellow-800":
                      displayOrder.estado === "bodega" ||
                      displayOrder.estado === "transportando",
                    "bg-blue-100 text-blue-800":
                      displayOrder.estado === "pagado",
                  })}
                  size="sm"
                  variant="flat"
                >
                  {statusLabels[displayOrder.estado]}
                </Chip>
              </div>
              {/* Método de entrega */}
              <div>
                <p className="text-sm text-default-500 mb-1">
                  Método de Entrega
                </p>
                <Chip
                  className="font-semibold bg-default-100"
                  size="sm"
                  variant="flat"
                >
                  {methodLabels[displayOrder.metodoEntrega]}
                </Chip>
              </div>
            </div>

            <Divider />

            {/* Sección de productos del pedido - diferente según modo editable o no */}
            {editable ? (
              // MODO EDICIÓN: Permite modificar estado, método y productos
              <div>
                {/* Sección para editar datos básicos del pedido */}
                <div className="mb-4">
                  <h3 className="text-lg font-semibold mb-3">
                    Editar Datos del Pedido
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Selector para cambiar el estado */}
                    <div>
                      <Select
                        label="Estado"
                        selectedKeys={new Set([editedEstado])}
                        onSelectionChange={(keys) => {
                          // Obtenemos el primer elemento del Set
                          const first = Array.from(keys as Set<string>)[0];

                          if (first) setEditedEstado(first as Order["estado"]);
                        }}
                      >
                        <SelectItem key="pendiente">Pendiente</SelectItem>
                        <SelectItem key="pagado">Pagado</SelectItem>
                        <SelectItem key="bodega">Bodega</SelectItem>
                        <SelectItem key="transportando">
                          Transportando
                        </SelectItem>
                        <SelectItem key="entregado">Entregado</SelectItem>
                      </Select>
                    </div>
                    {/* Selector para cambiar el método de entrega */}
                    <div>
                      <Select
                        label="Método de Entrega"
                        selectedKeys={new Set([editedMetodo])}
                        onSelectionChange={(keys) => {
                          const first = Array.from(keys as Set<string>)[0];

                          if (first)
                            setEditedMetodo(first as Order["metodoEntrega"]);
                        }}
                      >
                        <SelectItem key="recoger">Recoger</SelectItem>
                        <SelectItem key="domicilio">Domicilio</SelectItem>
                      </Select>
                    </div>
                  </div>
                </div>

                <Divider />

                {/* Editor de productos del pedido */}
                <div className="mt-4">
                  <h3 className="text-lg font-semibold mb-3">
                    Editar Productos del Pedido
                  </h3>
                  {loading ? (
                    // Muestra spinner mientras carga
                    <div className="flex justify-center py-8">
                      <Spinner label="Cargando detalles..." />
                    </div>
                  ) : (
                    // Componente editor que permite agregar/quitar/modificar productos
                    <OrderProductsEditorLocal
                      details={localDetails}
                      onChange={setLocalDetails}
                    />
                  )}
                </div>
              </div>
            ) : (
              // MODO SOLO LECTURA: Solo muestra la información sin permitir editar
              <div>
                <h3 className="text-lg font-semibold mb-3">
                  Productos del Pedido
                </h3>
                {loading ? (
                  // Muestra spinner mientras carga
                  <div className="flex justify-center py-8">
                    <Spinner label="Cargando detalles..." />
                  </div>
                ) : orderDetails.length > 0 ? (
                  // Si hay productos, los mostramos en tarjetas
                  <div className="space-y-3">
                    {/* Recorremos cada producto del pedido */}
                    {orderDetails.map((detail) => {
                      // Calculamos los valores para este producto
                      const precioUnitario = detail.precio || 0;
                      const cantidad = detail.cantidad || 0;
                      const subtotal = precioUnitario * cantidad;

                      return (
                        // Tarjeta de producto con información y subtotal
                        <div
                          key={detail.id}
                          className="flex justify-between items-start p-3 rounded-lg bg-default-50"
                        >
                          {/* Información del producto */}
                          <div className="flex-1">
                            <p className="font-medium">
                              {detail.nombreProducto || detail.producto}
                            </p>
                            <p className="text-sm text-default-500">
                              SKU: {detail.producto}
                            </p>
                            <p className="text-sm text-default-500">
                              Precio unitario: {formatCurrency(precioUnitario)}
                            </p>
                          </div>
                          {/* Cantidad y subtotal */}
                          <div className="text-right">
                            <p className="text-sm text-default-500">
                              Cantidad: {cantidad}
                            </p>
                            <p className="font-semibold text-lg">
                              {formatCurrency(subtotal)}
                            </p>
                          </div>
                        </div>
                      );
                    })}

                    <Divider />

                    {/* Tarjeta con el total general del pedido */}
                    <div className="flex justify-between items-center p-4 rounded-lg bg-primary-50">
                      <p className="text-lg font-bold">Total del Pedido:</p>
                      <p className="text-2xl font-bold text-primary">
                        {formatCurrency(calculateTotal())}
                      </p>
                    </div>
                  </div>
                ) : (
                  // Si no hay productos, mostramos un mensaje
                  <div className="text-center py-8 text-default-500">
                    No hay detalles disponibles para este pedido
                  </div>
                )}
              </div>
            )}
          </div>
        </ModalBody>
        {/* Pie del modal con botones según el modo (editable o no) */}
        <ModalFooter>
          {editable ? (
            // Botones para modo edición: Cancelar y Guardar
            <>
              <Button isDisabled={saving} variant="flat" onPress={onClose}>
                Cancelar
              </Button>
              <Button color="primary" isLoading={saving} onPress={handleSave}>
                Guardar Cambios
              </Button>
            </>
          ) : (
            // Botón para modo lectura: solo Cerrar
            <Button color="primary" onPress={onClose}>
              Cerrar
            </Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
