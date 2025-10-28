// Indicamos que este componente se ejecuta en el navegador (cliente)
"use client";

// Importamos los tipos de datos que usaremos (OrderDetail y Product)
import type { OrderDetail, Product } from "@/lib/types/database";

// Importamos useState y useCallback de React para manejar el estado y funciones optimizadas
import { useState, useCallback } from "react";
// Importamos componentes de la interfaz de usuario de HeroUI
import {
  Button,
  Input,
  Divider,
  Autocomplete,
  AutocompleteItem,
  Spinner,
} from "@heroui/react";
// Importamos iconos de lucide-react
import { Trash2, Plus, X } from "lucide-react";

// Definimos las propiedades que recibe este componente
type Props = {
  details: OrderDetail[]; // Lista de productos del pedido
  onChange: (details: OrderDetail[]) => void; // Función que se ejecuta cuando cambian los productos
};

export default function OrderProductsEditorLocal({ details, onChange }: Props) {
  // Estado para controlar qué productos están siendo editados
  // Solo guardamos la cantidad nueva (no la original como en OrderProductsEditor)
  const [editingDetails, setEditingDetails] = useState<
    Map<string, { cantidad: number }>
  >(new Map());

  // Estado para controlar si estamos agregando un nuevo producto
  const [addingProduct, setAddingProduct] = useState(false);

  // Estado para el nuevo producto que queremos agregar
  const [newProduct, setNewProduct] = useState<{
    producto: string; // SKU del producto
    cantidad: number; // Cantidad a agregar
    nombreProducto: string; // Nombre del producto
    precio: number; // Precio del producto
  }>({ producto: "", cantidad: 1, nombreProducto: "", precio: 0 });

  // Estado para la lista de productos disponibles
  const [products, setProducts] = useState<Product[]>([]);

  // Estado para saber si estamos cargando la lista de productos
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Estado para el texto de búsqueda de productos
  const [searchQuery, setSearchQuery] = useState("");

  // Estado para saber si hay más productos para cargar (paginación)
  const [hasMore, setHasMore] = useState(true);

  // Estado para la página actual de productos (paginación)
  const [currentPage, setCurrentPage] = useState(1);

  // Función para cargar productos con soporte de paginación
  // useCallback memoriza la función para que no se recree en cada render
  // Parámetros:
  // - search: texto de búsqueda
  // - page: número de página
  // - append: si es true, agrega productos a la lista existente; si es false, reemplaza la lista
  const loadProducts = useCallback(
    async (search: string = "", page: number = 1, append: boolean = false) => {
      // Indicamos que estamos cargando productos
      setLoadingProducts(true);
      try {
        // Hacemos una petición a la API para obtener productos
        // Incluimos la búsqueda, límite de 20 productos y el número de página
        const response = await fetch(
          `/api/products/data?search=${encodeURIComponent(
            search
          )}&limit=20&page=${page}`
        );

        // Si la respuesta es exitosa
        if (response.ok) {
          // Obtenemos los datos y la información de paginación
          const { data, pagination } = await response.json();

          // Si append es true, agregamos los nuevos productos a la lista existente
          // Esto es útil para el scroll infinito
          if (append) {
            setProducts((prev) => [...prev, ...(data || [])]);
          } else {
            // Si append es false, reemplazamos toda la lista
            setProducts(data || []);
          }
          // Verificamos si hay más páginas disponibles
          setHasMore(pagination.page < pagination.totalPages);
          // Guardamos el número de página actual
          setCurrentPage(page);
        }
      } catch (error) {
        // Si hay un error, lo ignoramos silenciosamente
        // (podríamos mostrar un mensaje al usuario aquí)
      } finally {
        // Siempre indicamos que terminamos de cargar
        setLoadingProducts(false);
      }
    },
    [] // Array vacío significa que esta función nunca cambia
  );

  // Función para cargar más productos cuando el usuario hace scroll
  // useCallback evita que se recree la función innecesariamente
  const loadMore = useCallback(() => {
    // Solo cargamos más si hay más productos y no estamos cargando actualmente
    if (hasMore && !loadingProducts) {
      // Cargamos la siguiente página y agregamos los productos a la lista
      loadProducts(searchQuery, currentPage + 1, true);
    }
  }, [hasMore, loadingProducts, searchQuery, currentPage, loadProducts]);

  // Función para comenzar a editar la cantidad de un producto
  // detailId: ID del detalle del pedido
  // currentCantidad: cantidad actual del producto
  const startEdit = (detailId: string, currentCantidad: number) => {
    // Agregamos este producto al mapa de productos en edición
    setEditingDetails(
      new Map(editingDetails.set(detailId, { cantidad: currentCantidad }))
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

  // Función para guardar el cambio de cantidad (local, sin enviar a la API)
  // IMPORTANTE: Esta versión NO guarda en la base de datos, solo actualiza el estado local
  const saveQuantity = (detailId: string) => {
    // Obtenemos los datos de edición de este producto
    const editing = editingDetails.get(detailId);

    // Si no hay datos de edición, cancelamos
    if (!editing) {
      cancelEdit(detailId);

      return;
    }

    // Creamos una nueva lista de detalles con la cantidad actualizada
    // .map() recorre todos los productos y actualiza solo el que coincide con detailId
    const updatedDetails = details.map((d) =>
      d.id === detailId ? { ...d, cantidad: editing.cantidad } : d
    );

    // Llamamos a la función onChange para notificar al componente padre del cambio
    onChange(updatedDetails);
    // Cancelamos el modo de edición
    cancelEdit(detailId);
  };

  // Función para eliminar un producto del pedido (local, sin enviar a la API)
  // IMPORTANTE: Esta versión NO elimina de la base de datos, solo actualiza el estado local
  const deleteDetail = (detailId: string) => {
    // Pedimos confirmación al usuario antes de eliminar
    if (!confirm("¿Estás seguro de eliminar este producto del pedido?")) {
      return; // Si cancela, no hacemos nada
    }

    // Filtramos la lista para excluir el producto que queremos eliminar
    // .filter() crea una nueva lista solo con los productos que NO tienen el detailId
    const updatedDetails = details.filter((d) => d.id !== detailId);

    // Llamamos a la función onChange para notificar al componente padre del cambio
    onChange(updatedDetails);
  };

  // Función para agregar un nuevo producto (local, sin enviar a la API)
  // IMPORTANTE: Esta versión NO guarda en la base de datos, solo actualiza el estado local
  const addProduct = () => {
    // Validamos que haya un producto seleccionado y una cantidad válida
    if (!newProduct.producto || newProduct.cantidad <= 0) {
      alert("Por favor selecciona un producto y cantidad válida");

      return;
    }

    // Buscamos el producto seleccionado en la lista de productos disponibles
    const selectedProduct = products.find((p) => p.sku === newProduct.producto);

    // Si no encontramos el producto, mostramos un error
    if (!selectedProduct) {
      alert("Producto no encontrado");

      return;
    }

    // Verificamos que haya suficiente stock disponible
    if (selectedProduct.stock < newProduct.cantidad) {
      alert(`Stock insuficiente. Disponible: ${selectedProduct.stock}`);

      return;
    }

    // Crear nuevo detalle con ID temporal
    // Este ID temporal se reemplazará por un ID real cuando se guarde en la base de datos
    const newDetail: OrderDetail = {
      id: `temp-${Date.now()}`, // ID temporal usando el timestamp actual
      producto: newProduct.producto, // SKU del producto
      pedido: "", // El ID del pedido se asignará después
      cantidad: newProduct.cantidad, // Cantidad seleccionada
      nombreProducto: selectedProduct.nombre, // Nombre del producto
      precio: selectedProduct.precio, // Precio del producto
    };

    // Agregamos el nuevo producto a la lista existente
    onChange([...details, newDetail]);
    // Limpiamos el formulario
    setNewProduct({ producto: "", cantidad: 1, nombreProducto: "", precio: 0 });
    // Ocultamos el formulario de agregar
    setAddingProduct(false);
    // Limpiamos la búsqueda
    setSearchQuery("");
  };

  // Función para formatear números como moneda colombiana (COP)
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency", // Formato de moneda
      currency: "COP", // Peso colombiano
      minimumFractionDigits: 0, // Sin decimales
    }).format(amount);
  };

  // Filtramos los productos para mostrar solo los que NO están ya en el pedido
  // Esto evita que el usuario agregue el mismo producto dos veces
  const availableProducts = products.filter(
    (product) => !details.some((detail) => detail.producto === product.sku)
  );

  return (
    <div className="space-y-3">
      {/* SECCIÓN 1: Lista de productos del pedido */}
      {/* Recorremos cada producto (detail) y lo mostramos */}
      {details.map((detail) => {
        // Verificamos si este producto está siendo editado
        const isEditing = editingDetails.has(detail.id);
        // Obtenemos los datos de edición si existen
        const editData = editingDetails.get(detail.id);
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
                            cantidad: newCantidad,
                          })
                        )
                      );
                    }}
                  />
                  {/* Botón para guardar los cambios (checkmark ✓) */}
                  <Button
                    isIconOnly
                    color="success"
                    size="sm"
                    variant="flat"
                    onPress={() => saveQuantity(detail.id)}
                  >
                    ✓
                  </Button>
                  {/* Botón para cancelar la edición */}
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
      <Divider />
      {/* SECCIÓN 2: Formulario para agregar nuevo producto */}
      {/* Si addingProduct es true, mostramos el formulario completo */}
      {addingProduct ? (
        <div className="p-3 rounded-lg bg-primary-50 space-y-3">
          <h4 className="font-semibold text-sm">Agregar Producto</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Autocomplete para buscar y seleccionar un producto */}
            <Autocomplete
              defaultItems={availableProducts} // Solo productos que no están en el pedido
              inputValue={searchQuery} // Texto de búsqueda
              isLoading={loadingProducts} // Indicador de carga
              label="Producto"
              placeholder="Buscar producto..."
              onInputChange={(value) => {
                // Cuando el usuario escribe en la búsqueda
                setSearchQuery(value);
                // Reiniciamos la paginación
                setCurrentPage(1);
                setHasMore(true);
                // Si escribe 2 o más caracteres, buscamos productos
                if (value.length >= 2) {
                  loadProducts(value, 1, false);
                } else if (value.length === 0) {
                  // Si borra todo, cargamos todos los productos
                  loadProducts("", 1, false);
                }
              }}
              onOpenChange={(isOpen) => {
                // Cuando se abre el dropdown y no hay productos cargados
                if (isOpen && products.length === 0) {
                  loadProducts("", 1, false);
                }
              }}
              onSelectionChange={(key) => {
                // Cuando el usuario selecciona un producto
                if (key) {
                  // Buscamos el producto seleccionado en la lista
                  const selected = availableProducts.find(
                    (p) => p.sku === String(key)
                  );

                  // Si lo encontramos, guardamos toda su información
                  if (selected) {
                    setNewProduct({
                      producto: String(key), // SKU
                      cantidad: newProduct.cantidad, // Mantenemos la cantidad actual
                      nombreProducto: selected.nombre,
                      precio: selected.precio,
                    });
                  }
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
              startContent={<Plus size={16} />}
              onPress={addProduct}
            >
              Agregar
            </Button>
            {/* Botón para cancelar y cerrar el formulario */}
            <Button
              variant="flat"
              onPress={() => {
                // Ocultamos el formulario
                setAddingProduct(false);
                // Limpiamos todos los datos
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
        // Si addingProduct es false, mostramos solo el botón para abrir el formulario
        <Button
          color="primary"
          startContent={<Plus size={16} />}
          variant="flat"
          onPress={() => {
            // Mostramos el formulario
            setAddingProduct(true);
            // Limpiamos la lista de productos para cargar desde cero
            setProducts([]);
            // Reiniciamos la paginación
            setCurrentPage(1);
            setHasMore(true);
          }}
        >
          Agregar Producto
        </Button>
      )}
      {/* Botón "Cargar más" - Solo se muestra si:
          1. Estamos agregando un producto (addingProduct = true)
          2. Hay productos disponibles en la lista
          3. Hay más productos para cargar (hasMore = true) */}
      {addingProduct && availableProducts.length > 0 && hasMore && (
        <Button
          fullWidth
          isDisabled={loadingProducts} // Deshabilitado mientras carga
          size="sm"
          startContent={
            loadingProducts ? <Spinner color="current" size="sm" /> : null
          }
          variant="light"
          onPress={loadMore} // Al hacer clic, carga la siguiente página
        >
          {loadingProducts ? "Cargando..." : "Cargar más productos..."}
        </Button>
      )}
      {/* Indicador de carga inicial - Solo se muestra cuando:
          1. Estamos agregando un producto
          2. Estamos cargando productos
          3. Aún no hay productos en la lista */}
      {addingProduct && loadingProducts && products.length === 0 && (
        <div className="flex items-center justify-center gap-2 p-4">
          <Spinner size="sm" />
          <span className="text-sm text-default-500">Cargando...</span>
        </div>
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
