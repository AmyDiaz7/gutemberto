// Esta directiva indica que este componente se ejecuta en el navegador del cliente
"use client";

// Importamos el tipo Product que define la estructura de un producto
import type { Product } from "@/lib/types/database";

// Importamos componentes de HeroUI y utilidades
import { Button, Pagination, SortDescriptor } from "@heroui/react";
// Importamos ícono de Plus (símbolo +)
import { Plus } from "lucide-react";
// Importamos hooks de React para manejar estado, efectos y transiciones
import { useState, useEffect, useTransition, useRef, useCallback } from "react";
// Importamos hooks de Next.js para navegación y parámetros de URL
import { useRouter, useSearchParams, usePathname } from "next/navigation";

// Importamos los componentes hijos que componen esta tabla
import ActiveFilters from "./ActiveFilters";
import FiltersBar from "./FiltersBar";
import ProductDataTable from "./ProductDataTable";
import ProductForm from "./ProductForm";
import ConfirmDialog from "./ConfirmDialog";

// Diccionario que traduce códigos de estado a nombres legibles
const statusOptions: Record<string, string> = {
  disponible: "Disponible",
  agotado: "Agotado",
  descontinuado: "Descontinuado",
};

// Componente principal que maneja toda la tabla de productos con filtros, búsqueda y paginación
export default function ProductTable() {
  // ===== ESTADOS DEL COMPONENTE =====
  // Estado de carga general
  const [isLoading, setIsLoading] = useState(true);
  // Lista de productos a mostrar
  const [list, setList] = useState<Product[]>([]);
  // Lista de categorías disponibles para filtrar
  const [categories, setCategories] = useState<string[]>([]);
  // Estado de carga específico para categorías
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  // Término de búsqueda actual
  const [searchTerm, setSearchTerm] = useState("");
  // Total de productos (considerando filtros)
  const [total, setTotal] = useState(0);
  // Total de páginas disponibles
  const [totalPages, setTotalPages] = useState(1);
  // Controla si el formulario modal está abierto
  const [formOpen, setFormOpen] = useState(false);
  // Modo del formulario: crear nuevo o editar existente
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  // Producto que se está editando (null si estamos creando uno nuevo)
  const [editing, setEditing] = useState<Product | null>(null);
  // Controla si el diálogo de confirmación está abierto
  const [confirmOpen, setConfirmOpen] = useState(false);
  // SKU del producto que se va a eliminar
  const [deletingSku, setDeletingSku] = useState<string | null>(null);
  // Estado de carga durante la eliminación
  const [deleting, setDeleting] = useState(false);

  // ===== HOOKS DE NAVEGACIÓN =====
  const { replace } = useRouter(); // Función para actualizar la URL
  const searchParams = useSearchParams(); // Parámetros actuales de la URL
  const pathname = usePathname(); // Ruta actual (sin parámetros)
  const [isPending, startTransition] = useTransition(); // Maneja transiciones de navegación
  const loading = isLoading || isPending; // Estado de carga combinado

  // ===== REFERENCIAS PARA CONTROL DE PETICIONES =====
  // Rastrea el ID de la última petición para ignorar respuestas obsoletas
  const requestIdRef = useRef(0);
  // Controlador para cancelar peticiones HTTP en curso
  const abortRef = useRef<AbortController | null>(null);

  // ===== EXTRACCIÓN DE PARÁMETROS DE LA URL =====
  // Obtiene las categorías seleccionadas desde la URL (separadas por comas)
  const selectedCategories = searchParams.get("categoria")?.split(",") || [];
  // Obtiene los estados seleccionados desde la URL (separados por comas)
  const selectedEstados = searchParams.get("estado")?.split(",") || [];
  // Obtiene el término de búsqueda actual desde la URL
  const currentSearch = searchParams.get("search") || "";

  // ===== ESTADOS LOCALES PARA FEEDBACK INMEDIATO EN LA UI =====
  // Set de categorías seleccionadas (Set evita duplicados)
  const [selectedCats, setSelectedCats] = useState<Set<string>>(
    new Set(selectedCategories.filter(Boolean)) // filter(Boolean) elimina valores vacíos
  );
  // Set de estados seleccionados
  const [selectedStates, setSelectedStates] = useState<Set<string>>(
    new Set(selectedEstados.filter(Boolean))
  );

  // Sincroniza el término de búsqueda local con el de la URL cuando cambia
  useEffect(() => {
    setSearchTerm(currentSearch);
  }, [currentSearch]);

  // ===== FUNCIONES AUXILIARES PARA CONVERSIÓN DE ORDENAMIENTO =====
  // Convierte el formato de orden de la URL ("asc"/"desc") al formato de la UI ("ascending"/"descending")
  const fromUrlOrder = (val?: string | null): "ascending" | "descending" => {
    const v = (val || "").toLowerCase();

    return v === "desc" || v === "descending" ? "descending" : "ascending";
  };
  // Convierte el formato de la UI al formato de la URL
  const toUrlOrder = (val?: "ascending" | "descending") =>
    val === "descending" ? "desc" : "asc";

  // ===== PARÁMETROS DE ORDENAMIENTO Y PAGINACIÓN =====
  // Obtiene la columna por la que se está ordenando (por defecto "sku")
  const sortColumn = searchParams.get("sort") || "sku";
  // Obtiene la dirección del ordenamiento
  const sortDirection = fromUrlOrder(searchParams.get("order"));
  // Página actual (por defecto 1)
  const currentPage = parseInt(searchParams.get("page") || "1");
  // Límite de productos por página (por defecto 10)
  const limit = parseInt(searchParams.get("limit") || "10");

  // Estado local del descriptor de ordenamiento
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: sortColumn,
    direction: sortDirection as "ascending" | "descending",
  });

  // Mantiene el sortDescriptor sincronizado con la URL para evitar desincronizaciones
  useEffect(() => {
    const col = searchParams.get("sort") || "sku";
    const dir = fromUrlOrder(searchParams.get("order"));

    setSortDescriptor({ column: col, direction: dir });
  }, [searchParams]);

  // Obtiene los parámetros de URL más recientes (útil para evitar perder actualizaciones concurrentes)
  const getLatestParams = () =>
    new URLSearchParams(
      typeof window !== "undefined"
        ? window.location.search // Usa la URL del navegador si está disponible
        : searchParams.toString() // Si no, usa los searchParams actuales
    );

  // ===== FUNCIÓN PARA ACTUALIZAR FILTROS EN LA URL =====
  // Actualiza un filtro específico en la URL con valores separados por comas
  const updateFilter = (key: string, values: string[]) => {
    setIsLoading(true); // Activa el estado de carga
    const params = getLatestParams(); // Obtiene los parámetros actuales

    if (values.length > 0) {
      // Si hay valores, los une con comas y los añade a la URL
      params.set(key, values.join(","));
    } else {
      // Si no hay valores, elimina el parámetro de la URL
      params.delete(key);
    }

    // Reinicia la paginación a la primera página cuando cambian los filtros
    params.set("page", "1");

    // Actualiza la URL usando una transición (para mejor UX)
    startTransition(() => replace(`${pathname}?${params.toString()}`));
  };

  // ===== MANEJADOR DE CAMBIO DE ORDENAMIENTO =====
  const handleSortChange = (descriptor: SortDescriptor) => {
    setIsLoading(true); // Activa el estado de carga
    const params = getLatestParams();

    // Actualiza el parámetro de columna de ordenamiento
    if (descriptor.column) {
      params.set("sort", String(descriptor.column));
    } else {
      params.delete("sort");
    }

    // Actualiza el parámetro de dirección del ordenamiento
    if (descriptor.direction) {
      params.set("order", toUrlOrder(descriptor.direction));
    } else {
      params.delete("order");
    }

    // Reinicia a la primera página cuando cambia el ordenamiento
    params.set("page", "1");

    // Actualiza la URL y el estado local
    startTransition(() => replace(`${pathname}?${params.toString()}`));
    setSortDescriptor(descriptor);
  };

  // ===== MANEJADOR PARA ELIMINAR UNA CATEGORÍA DEL FILTRO =====
  const handleRemoveCategory = (category: string) => {
    // Filtra la categoría eliminada del array de categorías seleccionadas
    const newCategories = Array.from(selectedCats).filter(
      (c) => c !== category
    );

    // Actualiza el estado local y la URL
    setSelectedCats(new Set(newCategories));
    updateFilter("categoria", newCategories);
  };

  // ===== MANEJADOR DE CAMBIO DE ESTADOS (DISPONIBLE, AGOTADO, ETC.) =====
  const handleStatusChange = (keys: Set<any> | string) => {
    // Si se selecciona "all", usa todas las claves de statusOptions
    // Si no, convierte el Set a array
    const selectedValues =
      keys === "all"
        ? Object.keys(statusOptions)
        : Array.from(keys as Set<string>);

    // Actualiza el estado local y la URL
    setSelectedStates(new Set(selectedValues));
    updateFilter("estado", selectedValues);
  };

  // ===== MANEJADOR DEL CAMBIO EN EL CAMPO DE BÚSQUEDA =====
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value); // Actualiza el término de búsqueda local
  };

  // ===== MANEJADOR DE ENVÍO DE BÚSQUEDA =====
  const handleSearch = () => {
    setIsLoading(true); // Activa el estado de carga
    const params = getLatestParams();

    // Si hay texto de búsqueda, lo añade a la URL; si no, lo elimina
    if (searchTerm.trim()) {
      params.set("search", searchTerm.trim());
    } else {
      params.delete("search");
    }

    // Reinicia a la primera página cuando cambia la búsqueda
    params.set("page", "1");

    // Actualiza la URL
    startTransition(() => replace(`${pathname}?${params.toString()}`));
  };

  // ===== MANEJADOR PARA LA TECLA ENTER EN EL CAMPO DE BÚSQUEDA =====
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch(); // Ejecuta la búsqueda al presionar Enter
    }
  };

  // ===== FUNCIÓN PARA LIMPIAR TODOS LOS FILTROS =====
  const clearFilters = () => {
    const params = getLatestParams();

    // Elimina los filtros de categoría y estado, pero mantiene la búsqueda
    params.delete("categoria");
    params.delete("estado");
    params.set("page", "1"); // Reinicia a la primera página

    // Actualiza la URL
    startTransition(() => replace(`${pathname}?${params.toString()}`));
  };

  // ===== EFECTO PARA CARGAR CATEGORÍAS AL MONTAR EL COMPONENTE =====
  // Se ejecuta una sola vez cuando el componente se monta
  useEffect(() => {
    const fetchCategories = async () => {
      setIsLoadingCategories(true); // Activa el estado de carga
      try {
        // Hace una petición GET al endpoint de categorías
        const response = await fetch("/api/categories");
        const data = await response.json();

        setCategories(data); // Guarda las categorías en el estado
      } catch (error) {
        // Si hay error, no hace nada (silencioso)
      } finally {
        setIsLoadingCategories(false); // Desactiva el estado de carga siempre
      }
    };

    fetchCategories(); // Ejecuta la función
  }, []); // Array vacío = se ejecuta solo una vez al montar

  // Fetch data (reusable) and cancel stale requests
  const fetchData = useCallback(async () => {
    setIsLoading(true);

    // cancel previous in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();

    abortRef.current = controller;

    const requestId = ++requestIdRef.current;
    const url = `/api/products/data?${searchParams.toString()}`;

    try {
      const response = await fetch(url, { signal: controller.signal });
      const { data, pagination } = await response.json();

      // ignore stale responses
      if (requestId === requestIdRef.current && !controller.signal.aborted) {
        const newTotal = pagination?.total ?? 0;
        const newTotalPages = pagination?.totalPages ?? 1;

        // If the current page is now out of range (e.g., deleted last item on last page),
        // navigate to the last valid page and let the effect refetch.
        const lastValidPage = newTotalPages === 0 ? 1 : newTotalPages;

        if (currentPage > lastValidPage) {
          setTotal(newTotal);
          setTotalPages(newTotalPages);
          const params = getLatestParams();

          params.set("page", String(lastValidPage));
          startTransition(() => replace(`${pathname}?${params.toString()}`));

          return; // Avoid briefly showing an empty page; we'll refetch on URL change
        }

        setList(data);
        setTotal(newTotal);
        setTotalPages(newTotalPages);
        setIsLoading(false);
      }
    } catch (error: any) {
      if (error?.name !== "AbortError") {
        if (requestId === requestIdRef.current) {
          setIsLoading(false);
        }
      }
    }
  }, [searchParams, pathname, replace, currentPage]);

  // Refetch when search params change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Sync local selection state when URL changes externally
  useEffect(() => {
    setSelectedCats(
      new Set((searchParams.get("categoria")?.split(",") || []).filter(Boolean))
    );
    setSelectedStates(
      new Set((searchParams.get("estado")?.split(",") || []).filter(Boolean))
    );
  }, [searchParams]);

  // ===== RENDERIZADO DEL COMPONENTE =====
  return (
    // Contenedor principal con diseño de columna flexible
    <div className="flex flex-col h-full w-full overflow-hidden p-6">
      {/* ===== SECCIÓN DE FILTROS - FIJA EN LA PARTE SUPERIOR ===== */}
      <div className="flex-none space-y-4 mb-4">
        {/* Barra de filtros con campos de búsqueda, categorías y estados */}
        <FiltersBar
          categories={categories}
          isLoadingCategories={isLoadingCategories}
          searchTerm={searchTerm}
          selectedCats={selectedCats}
          selectedStates={selectedStates}
          statusOptions={statusOptions}
          onCategoriesChange={(keys: string | Set<any>) => {
            // Maneja el cambio de selección de categorías
            const selectedValues =
              keys === "all" ? categories : Array.from(keys as Set<string>);

            setSelectedCats(new Set(selectedValues));
            updateFilter("categoria", selectedValues);
          }}
          onClearSearch={() => {
            // Maneja la limpieza del campo de búsqueda
            setIsLoading(true);
            setSearchTerm(""); // Limpia el término de búsqueda local
            const params = getLatestParams();

            params.delete("search"); // Elimina el parámetro de búsqueda de la URL
            // Reinicia a la primera página al limpiar la búsqueda
            params.set("page", "1");

            startTransition(() => replace(`${pathname}?${params.toString()}`));
          }}
          onKeyDown={handleKeyDown} // Maneja eventos de teclado (Enter)
          onSearch={handleSearch} // Maneja el clic en el botón de buscar
          onSearchChange={handleSearchChange} // Maneja cambios en el campo de búsqueda
          onStatesChange={handleStatusChange} // Maneja cambios en los estados
        />

        {/* Muestra los filtros activos como chips que se pueden eliminar */}
        <ActiveFilters
          selectedCats={selectedCats}
          selectedStates={selectedStates}
          statusOptions={statusOptions}
          onClearAll={clearFilters} // Limpia todos los filtros
          onRemoveCategory={handleRemoveCategory} // Elimina una categoría específica
          onRemoveEstado={(estado: string) => {
            // Elimina un estado específico del filtro
            const newEstados = Array.from(selectedStates).filter(
              (s) => s !== estado
            );

            setSelectedStates(new Set(newEstados));
            updateFilter("estado", newEstados);
          }}
        />
      </div>

      {/* ===== SECCIÓN DE TABLA - DESPLAZABLE ===== */}
      <div className="flex-1 min-h-0 overflow-auto">
        <ProductDataTable
          items={list} // Lista de productos a mostrar
          loading={loading} // Estado de carga
          sortDescriptor={sortDescriptor} // Descriptor del ordenamiento actual
          onDelete={async (sku: string) => {
            // Maneja el clic en el botón de eliminar
            setDeletingSku(sku); // Guarda el SKU a eliminar
            setConfirmOpen(true); // Abre el diálogo de confirmación
          }}
          onEdit={(item) => {
            // Maneja el clic en el botón de editar
            setFormMode("edit"); // Cambia el modo a edición
            setEditing(item); // Guarda el producto a editar
            setFormOpen(true); // Abre el formulario
          }}
          onSortChange={handleSortChange} // Maneja cambios en el ordenamiento
        />
      </div>

      {/* ===== FILA DE PAGINACIÓN Y ACCIONES - FIJA EN LA PARTE INFERIOR ===== */}
      <div className="flex-none pt-4 border-t border-divider">
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center">
          {/* Izquierda: contador de resultados */}
          <div className="text-sm text-default-500 w-full text-center sm:text-left sm:flex-1">
            Mostrando {total === 0 ? 0 : (currentPage - 1) * limit + 1}–
            {Math.min(total, currentPage * limit)} de {total} productos
          </div>
          {/* Centro: componente de paginación */}
          <div className="w-full sm:flex-1 flex justify-center">
            <Pagination
              isCompact // Estilo compacto
              showControls // Muestra botones de primera/última página
              page={currentPage} // Página actual
              total={Math.max(totalPages, 1)} // Total de páginas (mínimo 1)
              onChange={(page) => {
                // Maneja el cambio de página
                setIsLoading(true);
                const params = getLatestParams();

                params.set("page", String(page)); // Actualiza el parámetro de página

                startTransition(() =>
                  replace(`${pathname}?${params.toString()}`)
                );
              }}
            />
          </div>
          {/* Derecha: botón de añadir (solo visible en desktop) */}
          <div className="w-full sm:flex-1 flex justify-end">
            <Button
              className="hidden sm:inline-flex" // Oculto en móvil
              color="primary"
              onPress={() => {
                // Abre el formulario en modo creación
                setFormMode("create");
                setEditing(null); // No hay producto siendo editado
                setFormOpen(true);
              }}
            >
              Añadir producto
            </Button>
          </div>
        </div>
      </div>

      {/* ===== FORMULARIO MODAL PARA CREAR/EDITAR PRODUCTOS ===== */}
      <ProductForm
        initial={editing ?? undefined} // Datos iniciales si estamos editando
        isOpen={formOpen} // Si el formulario está abierto
        mode={formMode} // Modo: crear o editar
        onClose={() => setFormOpen(false)} // Cierra el formulario
        onSaved={() => {
          // Después de guardar, recarga los datos inmediatamente
          fetchData();
        }}
      />

      {/* ===== DIÁLOGO DE CONFIRMACIÓN PARA ELIMINAR ===== */}
      <ConfirmDialog
        cancelText="Cancelar"
        confirmText="Eliminar"
        description={
          deletingSku
            ? `¿Seguro que deseas eliminar el producto ${deletingSku}?`
            : undefined
        }
        isLoading={deleting} // Muestra spinner durante la eliminación
        isOpen={confirmOpen} // Si el diálogo está abierto
        title="Eliminar producto"
        variant="danger" // Variante roja para acción peligrosa
        onCancel={() => {
          // Cancela la eliminación
          setConfirmOpen(false);
          setDeletingSku(null);
        }}
        onConfirm={async () => {
          // Confirma y ejecuta la eliminación
          if (!deletingSku) return;

          setDeleting(true); // Activa el estado de eliminación
          setIsLoading(true);
          try {
            // Hace la petición DELETE al backend
            const res = await fetch(
              `/api/products/${encodeURIComponent(deletingSku)}`,
              { method: "DELETE" }
            );

            if (res.ok) {
              // Si se eliminó el único producto de la última página, retrocede una página
              const isLastItemOnPage =
                list.length === 1 &&
                currentPage > 1 &&
                currentPage === totalPages;

              if (isLastItemOnPage) {
                const params = getLatestParams();

                params.set("page", String(currentPage - 1));
                startTransition(() =>
                  replace(`${pathname}?${params.toString()}`)
                );
              } else {
                // Si no, simplemente recarga los datos
                await fetchData();
              }
            }
          } finally {
            // Siempre ejecuta esto al final
            setDeleting(false);
            setConfirmOpen(false);
            setDeletingSku(null);
            // Si la petición falló, detiene el estado de carga
            setIsLoading(false);
          }
        }}
        onOpenChange={(open) => {
          // Maneja el cierre del diálogo
          if (!open) {
            setConfirmOpen(false);
            setDeletingSku(null);
          }
        }}
      />

      {/* ===== BOTÓN FLOTANTE PARA MÓVILES ===== */}
      {/* Botón circular flotante que aparece solo en dispositivos móviles */}
      <Button
        isIconOnly // Solo muestra el ícono, sin texto
        aria-label="Añadir producto" // Etiqueta para accesibilidad
        className="sm:hidden fixed bottom-6 right-6 z-50 shadow-xl rounded-full h-16 w-16" // Oculto en pantallas grandes
        color="primary"
        size="lg"
        onPress={() => {
          // Abre el formulario en modo creación
          setFormMode("create");
          setEditing(null);
          setFormOpen(true);
        }}
      >
        <Plus className="h-6 w-6" /> {/* Ícono de plus */}
      </Button>
    </div>
  );
}
