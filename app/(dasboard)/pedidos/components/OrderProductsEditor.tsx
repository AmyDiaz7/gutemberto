"use client";

import type { OrderDetail, Product } from "@/lib/types/database";

import { useState } from "react";
import {
  Button,
  Input,
  Divider,
  Autocomplete,
  AutocompleteItem,
} from "@heroui/react";
import { Trash2, Plus, Save, X } from "lucide-react";

type Props = {
  orderId: string;
  details: OrderDetail[];
  onUpdate: () => void;
};

export default function OrderProductsEditor({
  orderId,
  details,
  onUpdate,
}: Props) {
  const [editingDetails, setEditingDetails] = useState<
    Map<string, { cantidad: number; original: number }>
  >(new Map());
  const [loading, setLoading] = useState<string | null>(null);
  const [addingProduct, setAddingProduct] = useState(false);
  const [newProduct, setNewProduct] = useState<{
    producto: string;
    cantidad: number;
  }>({ producto: "", cantidad: 1 });
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Cargar productos disponibles
  const loadProducts = async (search: string = "") => {
    setLoadingProducts(true);
    try {
      const response = await fetch(
        `/api/products/data?search=${encodeURIComponent(search)}&limit=50`
      );

      if (response.ok) {
        const data = await response.json();

        setProducts(data.data || []);
      }
    } catch (error) {
      // Handle error silently
    } finally {
      setLoadingProducts(false);
    }
  };

  // Iniciar edición de cantidad
  const startEdit = (detailId: string, currentCantidad: number) => {
    setEditingDetails(
      new Map(
        editingDetails.set(detailId, {
          cantidad: currentCantidad,
          original: currentCantidad,
        })
      )
    );
  };

  // Cancelar edición
  const cancelEdit = (detailId: string) => {
    const newMap = new Map(editingDetails);

    newMap.delete(detailId);
    setEditingDetails(newMap);
  };

  // Guardar cambio de cantidad
  const saveQuantity = async (detailId: string) => {
    const editing = editingDetails.get(detailId);

    if (!editing || editing.cantidad === editing.original) {
      cancelEdit(detailId);

      return;
    }

    setLoading(detailId);
    try {
      const response = await fetch(
        `/api/orders/${orderId}/details/${detailId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cantidad: editing.cantidad }),
        }
      );

      if (!response.ok) {
        const error = await response.json();

        throw new Error(error.error || "Error al actualizar cantidad");
      }

      cancelEdit(detailId);
      onUpdate();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(null);
    }
  };

  // Eliminar producto del pedido
  const deleteDetail = async (detailId: string) => {
    if (!confirm("¿Estás seguro de eliminar este producto del pedido?")) {
      return;
    }

    setLoading(detailId);
    try {
      const response = await fetch(
        `/api/orders/${orderId}/details/${detailId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const error = await response.json();

        throw new Error(error.error || "Error al eliminar producto");
      }

      onUpdate();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(null);
    }
  };

  // Agregar nuevo producto
  const addProduct = async () => {
    if (!newProduct.producto || newProduct.cantidad <= 0) {
      alert("Por favor selecciona un producto y cantidad válida");

      return;
    }

    setLoading("adding");
    try {
      const response = await fetch(`/api/orders/${orderId}/details`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProduct),
      });

      if (!response.ok) {
        const error = await response.json();

        throw new Error(error.error || "Error al agregar producto");
      }

      setNewProduct({ producto: "", cantidad: 1 });
      setAddingProduct(false);
      onUpdate();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-3">
      {/* Lista de productos */}
      {details.map((detail) => {
        const isEditing = editingDetails.has(detail.id);
        const editData = editingDetails.get(detail.id);
        const isLoading = loading === detail.id;
        const precioUnitario = detail.precio || 0;
        const cantidad = isEditing ? editData!.cantidad : detail.cantidad;
        const subtotal = precioUnitario * cantidad;

        return (
          <div
            key={detail.id}
            className="flex justify-between items-start p-3 rounded-lg bg-default-50 gap-3"
          >
            <div className="flex-1">
              <p className="font-medium">
                {detail.nombreProducto || detail.producto}
              </p>
              <p className="text-sm text-default-500">SKU: {detail.producto}</p>
              <p className="text-sm text-default-500">
                Precio unitario: {formatCurrency(precioUnitario)}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <Input
                    className="w-20"
                    min={1}
                    size="sm"
                    type="number"
                    value={String(editData!.cantidad)}
                    onChange={(e) => {
                      const newCantidad = parseInt(e.target.value) || 1;

                      setEditingDetails(
                        new Map(
                          editingDetails.set(detail.id, {
                            ...editData!,
                            cantidad: newCantidad,
                          })
                        )
                      );
                    }}
                  />
                  <Button
                    isIconOnly
                    color="success"
                    isLoading={isLoading}
                    size="sm"
                    variant="flat"
                    onPress={() => saveQuantity(detail.id)}
                  >
                    <Save size={16} />
                  </Button>
                  <Button
                    isIconOnly
                    color="default"
                    isDisabled={isLoading}
                    size="sm"
                    variant="flat"
                    onPress={() => cancelEdit(detail.id)}
                  >
                    <X size={16} />
                  </Button>
                </>
              ) : (
                <>
                  <div className="text-right min-w-24">
                    <p className="text-sm text-default-500">
                      Cantidad: {cantidad}
                    </p>
                    <p className="font-semibold">{formatCurrency(subtotal)}</p>
                  </div>
                  <Button
                    color="primary"
                    isDisabled={isLoading}
                    size="sm"
                    variant="flat"
                    onPress={() => startEdit(detail.id, detail.cantidad)}
                  >
                    Editar
                  </Button>
                  <Button
                    isIconOnly
                    color="danger"
                    isLoading={isLoading}
                    size="sm"
                    variant="flat"
                    onPress={() => deleteDetail(detail.id)}
                  >
                    <Trash2 size={16} />
                  </Button>
                </>
              )}
            </div>
          </div>
        );
      })}

      <Divider />

      {/* Agregar nuevo producto */}
      {addingProduct ? (
        <div className="p-3 rounded-lg bg-primary-50 space-y-3">
          <h4 className="font-semibold text-sm">Agregar Producto</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Autocomplete
              defaultItems={products}
              inputValue={searchQuery}
              isLoading={loadingProducts}
              label="Producto"
              placeholder="Buscar producto..."
              onInputChange={(value) => {
                setSearchQuery(value);
                if (value.length >= 2) {
                  loadProducts(value);
                }
              }}
              onSelectionChange={(key) => {
                if (key) {
                  setNewProduct({ ...newProduct, producto: String(key) });
                }
              }}
            >
              {(product) => (
                <AutocompleteItem key={product.sku} textValue={product.nombre}>
                  <div className="flex flex-col">
                    <span className="font-medium">{product.nombre}</span>
                    <span className="text-xs text-default-500">
                      SKU: {product.sku} | Stock: {product.stock} |{" "}
                      {formatCurrency(product.precio)}
                    </span>
                  </div>
                </AutocompleteItem>
              )}
            </Autocomplete>

            <Input
              label="Cantidad"
              min={1}
              type="number"
              value={String(newProduct.cantidad)}
              onChange={(e) =>
                setNewProduct({
                  ...newProduct,
                  cantidad: parseInt(e.target.value) || 1,
                })
              }
            />
          </div>
          <div className="flex gap-2">
            <Button
              color="primary"
              isLoading={loading === "adding"}
              startContent={<Plus size={16} />}
              onPress={addProduct}
            >
              Agregar
            </Button>
            <Button
              isDisabled={loading === "adding"}
              variant="flat"
              onPress={() => {
                setAddingProduct(false);
                setNewProduct({ producto: "", cantidad: 1 });
                setSearchQuery("");
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <Button
          color="primary"
          startContent={<Plus size={16} />}
          variant="flat"
          onPress={() => {
            setAddingProduct(true);
            loadProducts();
          }}
        >
          Agregar Producto
        </Button>
      )}

      {/* Total */}
      <Divider />
      <div className="flex justify-between items-center p-4 rounded-lg bg-primary-50">
        <p className="text-lg font-bold">Total del Pedido:</p>
        <p className="text-2xl font-bold text-primary">
          {formatCurrency(
            details.reduce((total, detail) => {
              const cantidad = editingDetails.has(detail.id)
                ? editingDetails.get(detail.id)!.cantidad
                : detail.cantidad;

              return total + (detail.precio || 0) * cantidad;
            }, 0)
          )}
        </p>
      </div>
    </div>
  );
}
