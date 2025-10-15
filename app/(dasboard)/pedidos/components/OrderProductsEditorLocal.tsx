"use client";

import type { OrderDetail, Product } from "@/lib/types/database";

import { useState, useCallback } from "react";
import {
  Button,
  Input,
  Divider,
  Autocomplete,
  AutocompleteItem,
  Spinner,
} from "@heroui/react";
import { Trash2, Plus, X } from "lucide-react";

type Props = {
  details: OrderDetail[];
  onChange: (details: OrderDetail[]) => void;
};

export default function OrderProductsEditorLocal({ details, onChange }: Props) {
  const [editingDetails, setEditingDetails] = useState<
    Map<string, { cantidad: number }>
  >(new Map());
  const [addingProduct, setAddingProduct] = useState(false);
  const [newProduct, setNewProduct] = useState<{
    producto: string;
    cantidad: number;
    nombreProducto: string;
    precio: number;
  }>({ producto: "", cantidad: 1, nombreProducto: "", precio: 0 });
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  // Load products with pagination support
  const loadProducts = useCallback(
    async (search: string = "", page: number = 1, append: boolean = false) => {
      setLoadingProducts(true);
      try {
        const response = await fetch(
          `/api/products/data?search=${encodeURIComponent(
            search
          )}&limit=20&page=${page}`
        );

        if (response.ok) {
          const { data, pagination } = await response.json();

          if (append) {
            setProducts((prev) => [...prev, ...(data || [])]);
          } else {
            setProducts(data || []);
          }
          setHasMore(pagination.page < pagination.totalPages);
          setCurrentPage(page);
        }
      } catch (error) {
        // Handle error silently
      } finally {
        setLoadingProducts(false);
      }
    },
    []
  );

  // Load more products when scrolling
  const loadMore = useCallback(() => {
    if (hasMore && !loadingProducts) {
      loadProducts(searchQuery, currentPage + 1, true);
    }
  }, [hasMore, loadingProducts, searchQuery, currentPage, loadProducts]);

  // Iniciar edición de cantidad
  const startEdit = (detailId: string, currentCantidad: number) => {
    setEditingDetails(
      new Map(editingDetails.set(detailId, { cantidad: currentCantidad }))
    );
  };

  // Cancelar edición
  const cancelEdit = (detailId: string) => {
    const newMap = new Map(editingDetails);

    newMap.delete(detailId);
    setEditingDetails(newMap);
  };

  // Guardar cambio de cantidad (local)
  const saveQuantity = (detailId: string) => {
    const editing = editingDetails.get(detailId);

    if (!editing) {
      cancelEdit(detailId);

      return;
    }

    const updatedDetails = details.map((d) =>
      d.id === detailId ? { ...d, cantidad: editing.cantidad } : d
    );

    onChange(updatedDetails);
    cancelEdit(detailId);
  };

  // Eliminar producto del pedido (local)
  const deleteDetail = (detailId: string) => {
    if (!confirm("¿Estás seguro de eliminar este producto del pedido?")) {
      return;
    }

    const updatedDetails = details.filter((d) => d.id !== detailId);

    onChange(updatedDetails);
  };

  // Agregar nuevo producto (local)
  const addProduct = () => {
    if (!newProduct.producto || newProduct.cantidad <= 0) {
      alert("Por favor selecciona un producto y cantidad válida");

      return;
    }

    const selectedProduct = products.find((p) => p.sku === newProduct.producto);

    if (!selectedProduct) {
      alert("Producto no encontrado");

      return;
    }

    if (selectedProduct.stock < newProduct.cantidad) {
      alert(`Stock insuficiente. Disponible: ${selectedProduct.stock}`);

      return;
    }

    // Crear nuevo detalle con ID temporal
    const newDetail: OrderDetail = {
      id: `temp-${Date.now()}`,
      producto: newProduct.producto,
      pedido: "",
      cantidad: newProduct.cantidad,
      nombreProducto: selectedProduct.nombre,
      precio: selectedProduct.precio,
    };

    onChange([...details, newDetail]);
    setNewProduct({ producto: "", cantidad: 1, nombreProducto: "", precio: 0 });
    setAddingProduct(false);
    setSearchQuery("");
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Filter out products that are already in the order
  const availableProducts = products.filter(
    (product) => !details.some((detail) => detail.producto === product.sku)
  );

  return (
    <div className="space-y-3">
      {/* Lista de productos */}
      {details.map((detail) => {
        const isEditing = editingDetails.has(detail.id);
        const editData = editingDetails.get(detail.id);
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
                            cantidad: newCantidad,
                          })
                        )
                      );
                    }}
                  />
                  <Button
                    isIconOnly
                    color="success"
                    size="sm"
                    variant="flat"
                    onPress={() => saveQuantity(detail.id)}
                  >
                    ✓
                  </Button>
                  <Button
                    isIconOnly
                    color="default"
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
                    size="sm"
                    variant="flat"
                    onPress={() => startEdit(detail.id, detail.cantidad)}
                  >
                    Editar
                  </Button>
                  <Button
                    isIconOnly
                    color="danger"
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
              defaultItems={availableProducts}
              inputValue={searchQuery}
              isLoading={loadingProducts}
              label="Producto"
              placeholder="Buscar producto..."
              onInputChange={(value) => {
                setSearchQuery(value);
                setCurrentPage(1);
                setHasMore(true);
                if (value.length >= 2) {
                  loadProducts(value, 1, false);
                } else if (value.length === 0) {
                  loadProducts("", 1, false);
                }
              }}
              onOpenChange={(isOpen) => {
                if (isOpen && products.length === 0) {
                  loadProducts("", 1, false);
                }
              }}
              onSelectionChange={(key) => {
                if (key) {
                  const selected = availableProducts.find(
                    (p) => p.sku === String(key)
                  );

                  if (selected) {
                    setNewProduct({
                      producto: String(key),
                      cantidad: newProduct.cantidad,
                      nombreProducto: selected.nombre,
                      precio: selected.precio,
                    });
                  }
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
              startContent={<Plus size={16} />}
              onPress={addProduct}
            >
              Agregar
            </Button>
            <Button
              variant="flat"
              onPress={() => {
                setAddingProduct(false);
                setNewProduct({
                  producto: "",
                  cantidad: 1,
                  nombreProducto: "",
                  precio: 0,
                });
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
            setProducts([]);
            setCurrentPage(1);
            setHasMore(true);
          }}
        >
          Agregar Producto
        </Button>
      )}
      {/* Show "Load More" button if there are more products */}
      {addingProduct && availableProducts.length > 0 && hasMore && (
        <Button
          fullWidth
          isDisabled={loadingProducts}
          size="sm"
          startContent={
            loadingProducts ? <Spinner color="current" size="sm" /> : null
          }
          variant="light"
          onPress={loadMore}
        >
          {loadingProducts ? "Cargando..." : "Cargar más productos..."}
        </Button>
      )}
      {/* Show loading indicator when loading initial products */}
      {addingProduct && loadingProducts && products.length === 0 && (
        <div className="flex items-center justify-center gap-2 p-4">
          <Spinner size="sm" />
          <span className="text-sm text-default-500">Cargando...</span>
        </div>
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
