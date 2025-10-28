// Indicamos que este componente se ejecuta en el navegador (cliente)
"use client";

// Importamos los tipos de datos que usaremos (OrderDetail y Product)
import type { OrderDetail, Product } from "@/lib/types/database";

// Importamos useState para manejar el estado del componente
import { useState } from "react";
// Importamos componentes de la interfaz de usuario de HeroUI
import {
  Button,
  Input,
  Divider,
  Autocomplete,
  AutocompleteItem,
} from "@heroui/react";
// Importamos iconos de lucide-react
import { Trash2, Plus, Save, X } from "lucide-react";

// Definimos las propiedades que recibe este componente
type Props = {
  orderId: string; // ID del pedido que estamos editando
  details: OrderDetail[]; // Lista de productos del pedido
  onUpdate: () => void; // Función que se ejecuta cuando actualizamos el pedido
};

export default function OrderProductsEditor({
  orderId,
  details,
  onUpdate,
}: Props) {
  // Estado para controlar qué productos están siendo editados
  // Guardamos la cantidad actual y la cantidad original de cada producto
  const [editingDetails, setEditingDetails] = useState<
    Map<string, { cantidad: number; original: number }>
  >(new Map());

  // Estado para saber qué acción está en proceso (cargando)
  const [loading, setLoading] = useState<string | null>(null);

  // Estado para controlar si estamos agregando un nuevo producto
  const [addingProduct, setAddingProduct] = useState(false);

  // Estado para el nuevo producto que queremos agregar
  const [newProduct, setNewProduct] = useState<{
    producto: string; // SKU del producto
    cantidad: number; // Cantidad a agregar
  }>({ producto: "", cantidad: 1 });

  // Estado para la lista de productos disponibles
  const [products, setProducts] = useState<Product[]>([]);

  // Estado para saber si estamos cargando la lista de productos
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Estado para el texto de búsqueda de productos
  const [searchQuery, setSearchQuery] = useState("");

  // Función para cargar productos disponibles desde la API
  // El parámetro 'search' permite buscar productos por nombre o SKU
  const loadProducts = async (search: string = "") => {
    // Indicamos que estamos cargando productos
    setLoadingProducts(true);
    try {
      // Hacemos una petición a la API para obtener productos
      // encodeURIComponent protege la búsqueda de caracteres especiales
      const response = await fetch(
        `/api/products/data?search=${encodeURIComponent(search)}&limit=50`
      );

      // Si la respuesta es exitosa
      if (response.ok) {
        // Convertimos la respuesta a JSON
        const data = await response.json();

        // Guardamos los productos en el estado
        setProducts(data.data || []);
      }
    } catch (error) {
      // Si hay un error, lo ignoramos silenciosamente
      // (podríamos mostrar un mensaje al usuario aquí)
    } finally {
      // Siempre indicamos que terminamos de cargar, sin importar si fue exitoso o no
      setLoadingProducts(false);
    }
  };

  // Función para comenzar a editar la cantidad de un producto
  // detailId: ID del detalle del pedido
  // currentCantidad: cantidad actual del producto
  const startEdit = (detailId: string, currentCantidad: number) => {
    // Agregamos este producto al mapa de productos en edición
    // Guardamos tanto la cantidad actual como la original para poder cancelar
    setEditingDetails(
      new Map(
        editingDetails.set(detailId, {
          cantidad: currentCantidad, // Cantidad que el usuario puede modificar
          original: currentCantidad, // Cantidad original (para cancelar)
        })
      )
    );
  };

  // Función para cancelar la edición de un producto
  const cancelEdit = (detailId: string) => {
    // Creamos una nueva copia del mapa
    const newMap = new Map(editingDetails);

    // Eliminamos este producto del mapa de edición
    newMap.delete(detailId);
    setEditingDetails(newMap);
  };

  // Función para guardar el cambio de cantidad de un producto
  const saveQuantity = async (detailId: string) => {
    // Obtenemos los datos de edición de este producto
    const editing = editingDetails.get(detailId);

    // Si no hay cambios (la cantidad es igual a la original), solo cancelamos
    if (!editing || editing.cantidad === editing.original) {
      cancelEdit(detailId);

      return;
    }

    // Indicamos que este producto está siendo actualizado
    setLoading(detailId);
    try {
      // Enviamos la nueva cantidad a la API
      const response = await fetch(
        `/api/orders/${orderId}/details/${detailId}`,
        {
          method: "PATCH", // PATCH se usa para actualizar parcialmente
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cantidad: editing.cantidad }),
        }
      );

      // Si la API responde con un error
      if (!response.ok) {
        const error = await response.json();

        throw new Error(error.error || "Error al actualizar cantidad");
      }

      // Si todo salió bien, cancelamos la edición y actualizamos la vista
      cancelEdit(detailId);
      onUpdate(); // Esto recarga los datos del pedido
    } catch (error: any) {
      // Mostramos el error al usuario
      alert(error.message);
    } finally {
      // Quitamos el indicador de carga
      setLoading(null);
    }
  };

  // Función para eliminar un producto del pedido
  const deleteDetail = async (detailId: string) => {
    // Pedimos confirmación al usuario antes de eliminar
    if (!confirm("¿Estás seguro de eliminar este producto del pedido?")) {
      return; // Si cancela, no hacemos nada
    }

    // Indicamos que este producto está siendo eliminado
    setLoading(detailId);
    try {
      // Enviamos la petición de eliminación a la API
      const response = await fetch(
        `/api/orders/${orderId}/details/${detailId}`,
        {
          method: "DELETE", // DELETE se usa para eliminar
        }
      );

      // Si hay un error en la respuesta
      if (!response.ok) {
        const error = await response.json();

        throw new Error(error.error || "Error al eliminar producto");
      }

      // Si todo salió bien, actualizamos la vista
      onUpdate();
    } catch (error: any) {
      // Mostramos el error al usuario
      alert(error.message);
    } finally {
      // Quitamos el indicador de carga
      setLoading(null);
    }
  };

  // Función para agregar un nuevo producto al pedido
  const addProduct = async () => {
    // Validamos que haya un producto seleccionado y una cantidad válida
    if (!newProduct.producto || newProduct.cantidad <= 0) {
      alert("Por favor selecciona un producto y cantidad válida");

      return;
    }

    // Indicamos que estamos agregando un producto
    setLoading("adding");
    try {
      // Enviamos el nuevo producto a la API
      const response = await fetch(`/api/orders/${orderId}/details`, {
        method: "POST", // POST se usa para crear nuevos registros
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProduct),
      });

      // Si hay un error en la respuesta
      if (!response.ok) {
        const error = await response.json();

        throw new Error(error.error || "Error al agregar producto");
      }

      // Si todo salió bien:
      // 1. Limpiamos el formulario
      setNewProduct({ producto: "", cantidad: 1 });
      // 2. Ocultamos el formulario de agregar
      setAddingProduct(false);
      // 3. Actualizamos la vista del pedido
      onUpdate();
    } catch (error: any) {
      // Mostramos el error al usuario
      alert(error.message);
    } finally {
      // Quitamos el indicador de carga
      setLoading(null);
    }
  };

  // Función para formatear números como moneda colombiana (COP)
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency", // Formato de moneda
      currency: "COP", // Peso colombiano
      minimumFractionDigits: 0, // Sin decimales
    }).format(amount);
  };

  return (
    <div className="space-y-3">
      {/* SECCIÓN 1: Lista de productos del pedido */}
      {/* Recorremos cada producto (detail) y lo mostramos */}
      {details.map((detail) => {
        // Verificamos si este producto está siendo editado
        const isEditing = editingDetails.has(detail.id);
        // Obtenemos los datos de edición si existen
        const editData = editingDetails.get(detail.id);
        // Verificamos si este producto está en proceso de carga
        const isLoading = loading === detail.id;
        // Obtenemos el precio unitario del producto
        const precioUnitario = detail.precio || 0;
        // Si está editando, usamos la cantidad en edición, si no, la cantidad original
        const cantidad = isEditing ? editData!.cantidad : detail.cantidad;
        // Calculamos el subtotal (precio × cantidad)
        const subtotal = precioUnitario * cantidad;

        return (
          <div
            key={detail.id}
            className="flex justify-between items-start p-3 rounded-lg bg-default-50 gap-3"
          >
            {/* Información del producto */}
            <div className="flex-1">
              <p className="font-medium">
                {detail.nombreProducto || detail.producto}
              </p>
              <p className="text-sm text-default-500">SKU: {detail.producto}</p>
              <p className="text-sm text-default-500">
                Precio unitario: {formatCurrency(precioUnitario)}
              </p>
            </div>

            {/* Botones y controles */}
            <div className="flex items-center gap-2">
              {/* Si está en modo edición, mostramos el input y botones de guardar/cancelar */}
              {isEditing ? (
                <>
                  {/* Input para cambiar la cantidad */}
                  <Input
                    className="w-20"
                    min={1}
                    size="sm"
                    type="number"
                    value={String(editData!.cantidad)}
                    onChange={(e) => {
                      // Cuando el usuario cambia la cantidad
                      const newCantidad = parseInt(e.target.value) || 1;

                      // Actualizamos el estado con la nueva cantidad
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
                  {/* Botón para guardar los cambios */}
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
                  {/* Botón para cancelar la edición */}
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
                  {/* Si no está editando, mostramos la cantidad y subtotal */}
                  <div className="text-right min-w-24">
                    <p className="text-sm text-default-500">
                      Cantidad: {cantidad}
                    </p>
                    <p className="font-semibold">{formatCurrency(subtotal)}</p>
                  </div>
                  {/* Botón para comenzar a editar */}
                  <Button
                    color="primary"
                    isDisabled={isLoading}
                    size="sm"
                    variant="flat"
                    onPress={() => startEdit(detail.id, detail.cantidad)}
                  >
                    Editar
                  </Button>
                  {/* Botón para eliminar el producto */}
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

      {/* Línea divisoria */}
      {/* Línea divisoria */}
      <Divider />

      {/* SECCIÓN 2: Formulario para agregar nuevo producto */}
      {/* Si addingProduct es true, mostramos el formulario */}
      {addingProduct ? (
        <div className="p-3 rounded-lg bg-primary-50 space-y-3">
          <h4 className="font-semibold text-sm">Agregar Producto</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Autocomplete para buscar y seleccionar un producto */}
            <Autocomplete
              defaultItems={products} // Lista de productos disponibles
              inputValue={searchQuery} // Texto de búsqueda
              isLoading={loadingProducts} // Indicador de carga
              label="Producto"
              placeholder="Buscar producto..."
              onInputChange={(value) => {
                // Cuando el usuario escribe en la búsqueda
                setSearchQuery(value);
                // Si escribe 2 o más caracteres, buscamos productos
                if (value.length >= 2) {
                  loadProducts(value);
                }
              }}
              onSelectionChange={(key) => {
                // Cuando el usuario selecciona un producto
                if (key) {
                  // Guardamos el SKU del producto seleccionado
                  setNewProduct({ ...newProduct, producto: String(key) });
                }
              }}
            >
              {/* Cómo mostrar cada producto en la lista */}
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

            {/* Input para la cantidad */}
            <Input
              label="Cantidad"
              min={1}
              type="number"
              value={String(newProduct.cantidad)}
              onChange={(e) =>
                // Cuando el usuario cambia la cantidad
                setNewProduct({
                  ...newProduct,
                  cantidad: parseInt(e.target.value) || 1,
                })
              }
            />
          </div>
          {/* Botones de acción */}
          <div className="flex gap-2">
            {/* Botón para confirmar y agregar el producto */}
            <Button
              color="primary"
              isLoading={loading === "adding"}
              startContent={<Plus size={16} />}
              onPress={addProduct}
            >
              Agregar
            </Button>
            {/* Botón para cancelar y cerrar el formulario */}
            <Button
              isDisabled={loading === "adding"}
              variant="flat"
              onPress={() => {
                // Ocultamos el formulario
                setAddingProduct(false);
                // Limpiamos los datos
                setNewProduct({ producto: "", cantidad: 1 });
                setSearchQuery("");
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        // Si addingProduct es false, mostramos solo el botón para abrir el formulario
        <Button
          color="primary"
          startContent={<Plus size={16} />}
          variant="flat"
          onPress={() => {
            // Mostramos el formulario
            setAddingProduct(true);
            // Cargamos la lista inicial de productos
            loadProducts();
          }}
        >
          Agregar Producto
        </Button>
      )}

      {/* SECCIÓN 3: Total del pedido */}
      <Divider />
      <div className="flex justify-between items-center p-4 rounded-lg bg-primary-50">
        <p className="text-lg font-bold">Total del Pedido:</p>
        <p className="text-2xl font-bold text-primary">
          {/* Calculamos el total sumando todos los subtotales */}
          {formatCurrency(
            details.reduce((total, detail) => {
              // Para cada producto, obtenemos su cantidad
              // Si está editando, usamos la cantidad en edición
              const cantidad = editingDetails.has(detail.id)
                ? editingDetails.get(detail.id)!.cantidad
                : detail.cantidad;

              // Sumamos al total: precio × cantidad
              return total + (detail.precio || 0) * cantidad;
            }, 0) // Empezamos desde 0
          )}
        </p>
      </div>
    </div>
  );
}
