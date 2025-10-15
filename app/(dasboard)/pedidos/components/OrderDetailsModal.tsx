"use client";

import type { Order, OrderDetail } from "@/lib/types/database";

import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Spinner,
  Chip,
  Divider,
  Skeleton,
  Select,
  SelectItem,
} from "@heroui/react";
import { useEffect, useState } from "react";
import clsx from "clsx";

import OrderProductsEditorLocal from "./OrderProductsEditorLocal";

type Props = {
  isOpen: boolean;
  order: Order | null;
  onClose: () => void;
  editable?: boolean; // Si es true, permite editar productos
};

const statusLabels: Record<string, string> = {
  pendiente: "Pendiente",
  pagado: "Pagado",
  bodega: "Bodega",
  transportando: "Transportando",
  entregado: "Entregado",
};

const methodLabels: Record<string, string> = {
  recoger: "Recoger",
  domicilio: "Domicilio",
};

export default function OrderDetailsModal({
  isOpen,
  order,
  onClose,
  editable = false,
}: Props) {
  const [orderDetails, setOrderDetails] = useState<OrderDetail[]>([]);
  const [enrichedOrder, setEnrichedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Estados para editar el pedido
  const [editedEstado, setEditedEstado] =
    useState<Order["estado"]>("pendiente");
  const [editedMetodo, setEditedMetodo] =
    useState<Order["metodoEntrega"]>("recoger");

  // Estado local para cambios en productos (solo en modo edición)
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

  useEffect(() => {
    if (isOpen && order) {
      fetchOrderDetails();
    } else {
      setOrderDetails([]);
      setEnrichedOrder(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, order]);

  // Guardar cambios del pedido
  const handleSave = async () => {
    if (!displayOrder) return;

    setSaving(true);
    try {
      // 1. Guardar cambios del pedido (estado y método)
      const orderResponse = await fetch(
        `/api/orders/${encodeURIComponent(displayOrder.id)}`,
        {
          method: "PATCH",
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

      // 2. Procesar cambios en productos
      // Identificar productos a eliminar (los que estaban pero ya no están)
      const productsToDelete = orderDetails.filter(
        (original) => !localDetails.find((local) => local.id === original.id)
      );

      // Identificar productos a agregar (los que tienen ID temporal)
      const productsToAdd = localDetails.filter((detail) =>
        detail.id.startsWith("temp-")
      );

      // Identificar productos a actualizar (los que cambiaron cantidad)
      const productsToUpdate = localDetails.filter((local) => {
        const original = orderDetails.find((o) => o.id === local.id);

        return original && original.cantidad !== local.cantidad;
      });

      // Ejecutar eliminaciones
      for (const product of productsToDelete) {
        const response = await fetch(
          `/api/orders/${displayOrder.id}/details/${product.id}`,
          { method: "DELETE" }
        );

        if (!response.ok) {
          throw new Error(`Error al eliminar producto ${product.producto}`);
        }
      }

      // Ejecutar adiciones
      for (const product of productsToAdd) {
        const response = await fetch(`/api/orders/${displayOrder.id}/details`, {
          method: "POST",
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

      // Ejecutar actualizaciones
      for (const product of productsToUpdate) {
        const response = await fetch(
          `/api/orders/${displayOrder.id}/details/${product.id}`,
          {
            method: "PATCH",
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

      // Cerrar el modal
      onClose();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setSaving(false);
    }
  };

  if (!order) return null;

  // Use enriched order if available, otherwise use original order
  const displayOrder = enrichedOrder || order;

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const calculateTotal = () => {
    return orderDetails.reduce((total, detail) => {
      const precio = detail.precio || 0;
      const cantidad = detail.cantidad || 0;

      return total + precio * cantidad;
    }, 0);
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
              <div>
                <p className="text-sm text-default-500 mb-1">Estado</p>
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

            {/* Order Details */}
            {editable ? (
              <div>
                {/* Sección para editar datos del pedido */}
                <div className="mb-4">
                  <h3 className="text-lg font-semibold mb-3">
                    Editar Datos del Pedido
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Select
                        label="Estado"
                        selectedKeys={new Set([editedEstado])}
                        onSelectionChange={(keys) => {
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

                {/* Editor de productos */}
                <div className="mt-4">
                  <h3 className="text-lg font-semibold mb-3">
                    Editar Productos del Pedido
                  </h3>
                  {loading ? (
                    <div className="flex justify-center py-8">
                      <Spinner label="Cargando detalles..." />
                    </div>
                  ) : (
                    <OrderProductsEditorLocal
                      details={localDetails}
                      onChange={setLocalDetails}
                    />
                  )}
                </div>
              </div>
            ) : (
              <div>
                <h3 className="text-lg font-semibold mb-3">
                  Productos del Pedido
                </h3>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Spinner label="Cargando detalles..." />
                  </div>
                ) : orderDetails.length > 0 ? (
                  <div className="space-y-3">
                    {orderDetails.map((detail) => {
                      const precioUnitario = detail.precio || 0;
                      const cantidad = detail.cantidad || 0;
                      const subtotal = precioUnitario * cantidad;

                      return (
                        <div
                          key={detail.id}
                          className="flex justify-between items-start p-3 rounded-lg bg-default-50"
                        >
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

                    {/* Total General */}
                    <div className="flex justify-between items-center p-4 rounded-lg bg-primary-50">
                      <p className="text-lg font-bold">Total del Pedido:</p>
                      <p className="text-2xl font-bold text-primary">
                        {formatCurrency(calculateTotal())}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-default-500">
                    No hay detalles disponibles para este pedido
                  </div>
                )}
              </div>
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          {editable ? (
            <>
              <Button isDisabled={saving} variant="flat" onPress={onClose}>
                Cancelar
              </Button>
              <Button color="primary" isLoading={saving} onPress={handleSave}>
                Guardar Cambios
              </Button>
            </>
          ) : (
            <Button color="primary" onPress={onClose}>
              Cerrar
            </Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
