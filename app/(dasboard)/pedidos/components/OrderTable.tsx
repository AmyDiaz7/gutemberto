// Indicamos que este componente se ejecuta en el navegador (cliente)
"use client";
// Importamos el tipo de datos Order
import type { Order } from "@/lib/types/database";

// Importamos componentes de HeroUI
import { Button, Pagination, SortDescriptor } from "@heroui/react";
// Importamos el icono Plus
import { Plus } from "lucide-react";
// Importamos hooks de React para manejar estado, efectos, transiciones y referencias
import { useState, useEffect, useTransition, useRef, useCallback } from "react";
// Importamos hooks de Next.js para navegación y manejo de parámetros de URL
import { useRouter, useSearchParams, usePathname } from "next/navigation";

// Importamos los componentes que usaremos
import ActiveFilters from "./ActiveFilters";
import FiltersBar from "./FiltersBar";
import OrderDataTable from "./OrderDataTable";
import OrderForm from "./OrderForm";
import ConfirmDialog from "./ConfirmDialog";
import OrderDetailsModal from "./OrderDetailsModal";

// Opciones de estado del pedido (texto que verá el usuario)
const statusOptions: Record<string, string> = {
  pendiente: "Pendiente",
  pagado: "Pagado",
  bodega: "Bodega",
  transportando: "Transportando",
  entregado: "Entregado",
};

// Opciones de método de entrega (texto que verá el usuario)
const methodOptions: Record<string, string> = {
  recoger: "Recoger",
  domicilio: "Domicilio",
};

export default function OrderTable() {
  // ESTADOS PRINCIPALES
  // Estado para saber si estamos cargando datos
  const [isLoading, setIsLoading] = useState(true);
  // Lista de pedidos que se mostrará en la tabla
  const [list, setList] = useState<Order[]>([]);
  // Término de búsqueda que el usuario escribe
  const [searchTerm, setSearchTerm] = useState("");
  // Total de pedidos que coinciden con los filtros
  const [total, setTotal] = useState(0);
  // Total de páginas disponibles
  const [totalPages, setTotalPages] = useState(1);

  // ESTADOS PARA EL FORMULARIO DE CREAR/EDITAR
  // Controla si el formulario está abierto o cerrado
  const [formOpen, setFormOpen] = useState(false);
  // Modo del formulario: crear nuevo o editar existente
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  // Pedido que se está editando (null si estamos creando uno nuevo)
  const [editing, setEditing] = useState<Order | null>(null);

  // ESTADOS PARA EL DIÁLOGO DE CONFIRMACIÓN DE ELIMINACIÓN
  // Controla si el diálogo de confirmación está abierto
  const [confirmOpen, setConfirmOpen] = useState(false);
  // ID del pedido que se va a eliminar
  const [deletingId, setDeletingId] = useState<string | null>(null);
  // Indica si estamos en proceso de eliminar
  const [deleting, setDeleting] = useState(false);

  // ESTADOS PARA VER DETALLES DEL PEDIDO
  // Controla si el modal de detalles está abierto
  const [detailsOpen, setDetailsOpen] = useState(false);
  // Pedido cuyos detalles estamos viendo
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);

  // ESTADOS PARA EDITAR DETALLES (PRODUCTOS) DEL PEDIDO
  // Controla si el modal de edición de detalles está abierto
  const [editDetailsOpen, setEditDetailsOpen] = useState(false);
  // Pedido cuyos detalles (productos) estamos editando
  const [editingOrderDetails, setEditingOrderDetails] = useState<Order | null>(
    null
  );

  // HOOKS DE NEXT.JS
  // replace: función para cambiar la URL sin recargar la página
  const { replace } = useRouter();
  // searchParams: parámetros de la URL (ej: ?page=1&search=test)
  const searchParams = useSearchParams();
  // pathname: ruta actual (ej: /pedidos)
  const pathname = usePathname();
  // isPending y startTransition: para manejar transiciones de navegación
  const [isPending, startTransition] = useTransition();
  // loading: combinación de isLoading e isPending
  const loading = isLoading || isPending;

  // REFERENCIAS PARA MANEJAR PETICIONES ASÍNCRONAS
  // Contador para identificar la petición más reciente (evita respuestas obsoletas)
  const requestIdRef = useRef(0);
  // Controlador para cancelar peticiones en curso si hay una nueva
  // Controlador para cancelar peticiones en curso si hay una nueva
  const abortRef = useRef<AbortController | null>(null);

  // EXTRACCIÓN DE PARÁMETROS DE LA URL
  // Obtenemos los métodos seleccionados de la URL (separados por comas)
  // Ej: ?metodo=recoger,domicilio → ["recoger", "domicilio"]
  const selectedMetodos = searchParams.get("metodo")?.split(",") || [];
  // Obtenemos los estados seleccionados de la URL
  const selectedEstados = searchParams.get("estado")?.split(",") || [];
  // Obtenemos el término de búsqueda actual de la URL
  const currentSearch = searchParams.get("search") || "";

  // ESTADOS LOCALES PARA FILTROS (para feedback instantáneo en la UI)
  // Conjunto de métodos seleccionados (usamos Set para evitar duplicados)
  const [selectedMets, setSelectedMets] = useState<Set<string>>(
    new Set(selectedMetodos.filter(Boolean))
  );
  // Conjunto de estados seleccionados
  const [selectedStates, setSelectedStates] = useState<Set<string>>(
    new Set(selectedEstados.filter(Boolean))
  );

  // Sincronizar el término de búsqueda con la URL cuando cambia
  useEffect(() => {
    setSearchTerm(currentSearch);
  }, [currentSearch]);

  // FUNCIONES AUXILIARES PARA CONVERTIR ORDEN DE CLASIFICACIÓN
  // Convierte de formato URL (asc/desc) a formato UI (ascending/descending)
  const fromUrlOrder = (val?: string | null): "ascending" | "descending" => {
    const v = (val || "").toLowerCase();

    return v === "desc" || v === "descending" ? "descending" : "ascending";
  };
  // Convierte de formato UI (ascending/descending) a formato URL (asc/desc)
  const toUrlOrder = (val?: "ascending" | "descending") =>
    val === "descending" ? "desc" : "asc";

  // PARÁMETROS DE ORDENAMIENTO Y PAGINACIÓN
  // Columna por la que se ordenan los datos (default: fecha)
  const sortColumn = searchParams.get("sort") || "fecha";
  // Dirección del ordenamiento (ascendente o descendente)
  const sortDirection = fromUrlOrder(searchParams.get("order"));
  // Página actual (default: 1)
  const currentPage = parseInt(searchParams.get("page") || "1");
  // Cantidad de elementos por página (default: 10)
  const limit = parseInt(searchParams.get("limit") || "10");

  // Estado del descriptor de ordenamiento para la tabla
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: sortColumn,
    direction: sortDirection as "ascending" | "descending",
  });

  // Mantener sortDescriptor sincronizado con la URL
  // Esto evita desincronización cuando hay actualizaciones rápidas
  useEffect(() => {
    const col = searchParams.get("sort") || "fecha";
    const dir = fromUrlOrder(searchParams.get("order"));

    setSortDescriptor({ column: col, direction: dir });
  }, [searchParams]);

  // Función para obtener los parámetros más recientes de la URL
  // Usa window.location para evitar usar parámetros obsoletos
  // Función para obtener los parámetros más recientes de la URL
  // Usa window.location para evitar usar parámetros obsoletos
  const getLatestParams = () =>
    new URLSearchParams(
      typeof window !== "undefined"
        ? window.location.search
        : searchParams.toString()
    );

  // Función para actualizar filtros en la URL
  // key: nombre del parámetro (ej: "estado", "metodo")
  // values: array de valores seleccionados
  const updateFilter = (key: string, values: string[]) => {
    setIsLoading(true);
    const params = getLatestParams();

    // Si hay valores, los unimos con comas y los guardamos en la URL
    if (values.length > 0) {
      params.set(key, values.join(","));
    } else {
      // Si no hay valores, eliminamos el parámetro de la URL
      params.delete(key);
    }

    // Siempre volvemos a la página 1 cuando cambian los filtros
    params.set("page", "1");

    // Actualizamos la URL sin recargar la página
    startTransition(() => replace(`${pathname}?${params.toString()}`));
  };

  // Función para manejar cambios en el ordenamiento de la tabla
  const handleSortChange = (descriptor: SortDescriptor) => {
    setIsLoading(true);
    const params = getLatestParams();

    // Guardamos la columna por la que ordenar
    if (descriptor.column) {
      params.set("sort", String(descriptor.column));
    } else {
      params.delete("sort");
    }

    // Guardamos la dirección del ordenamiento (asc/desc)
    if (descriptor.direction) {
      params.set("order", toUrlOrder(descriptor.direction));
    } else {
      params.delete("order");
    }

    // Volvemos a la página 1 cuando cambia el ordenamiento
    params.set("page", "1");

    // Actualizamos la URL y el estado
    startTransition(() => replace(`${pathname}?${params.toString()}`));
    setSortDescriptor(descriptor);
  };

  // Función para manejar cambios en el filtro de método de entrega
  const handleMethodChange = (keys: Set<any> | string) => {
    // Si keys es "all", seleccionamos todos los métodos
    // Si no, convertimos el Set a un array
    const selectedValues =
      keys === "all"
        ? Object.keys(methodOptions)
        : Array.from(keys as Set<string>);

    // Actualizamos el estado local para feedback instantáneo
    setSelectedStates(new Set(selectedValues));
    // Actualizamos la URL con los nuevos filtros
    updateFilter("metodo", selectedValues);
  };

  // Función para manejar cambios en el filtro de estado del pedido
  const handleStatusChange = (keys: Set<any> | string) => {
    // Si keys es "all", seleccionamos todos los estados
    // Si no, convertimos el Set a un array
    const selectedValues =
      keys === "all"
        ? Object.keys(statusOptions)
        : Array.from(keys as Set<string>);

    // Actualizamos el estado local para feedback instantáneo
    setSelectedStates(new Set(selectedValues));
    // Actualizamos la URL con los nuevos filtros
    updateFilter("estado", selectedValues);
  };

  // Función que se ejecuta cuando el usuario escribe en el campo de búsqueda
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  // Función que se ejecuta cuando el usuario hace clic en el botón de buscar
  const handleSearch = () => {
    setIsLoading(true);
    const params = getLatestParams();

    // Si hay texto de búsqueda, lo agregamos a la URL
    if (searchTerm.trim()) {
      params.set("search", searchTerm.trim());
    } else {
      // Si está vacío, eliminamos el parámetro de búsqueda
      params.delete("search");
    }

    // Volvemos a la página 1 cuando cambia la búsqueda
    params.set("page", "1");

    // Actualizamos la URL
    startTransition(() => replace(`${pathname}?${params.toString()}`));
  };

  // Función para detectar cuando el usuario presiona Enter en el campo de búsqueda
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  // Función para limpiar todos los filtros
  // NOTA: No limpia el término de búsqueda, solo los filtros de método y estado
  const clearFilters = () => {
    const params = getLatestParams();

    // Eliminamos solo los filtros, mantenemos la búsqueda
    params.delete("metodo");
    params.delete("estado");
    // Volvemos a la página 1
    params.set("page", "1");

    // Actualizamos la URL
    startTransition(() => replace(`${pathname}?${params.toString()}`));
  };

  // Función principal para obtener datos de pedidos desde la API
  // useCallback memoriza la función para evitar recrearla innecesariamente
  const fetchData = useCallback(async () => {
    setIsLoading(true);

    // Cancelar cualquier petición anterior que aún esté en curso
    // Esto evita problemas cuando el usuario cambia filtros rápidamente
    abortRef.current?.abort();
    const controller = new AbortController();

    abortRef.current = controller;

    // Incrementamos el ID de petición para identificar la más reciente
    const requestId = ++requestIdRef.current;
    // Construimos la URL con todos los parámetros actuales (filtros, paginación, etc.)
    const url = `/api/orders/data?${searchParams.toString()}`;

    try {
      // Hacemos la petición a la API
      // signal: permite cancelar la petición si es necesario
      const response = await fetch(url, { signal: controller.signal });
      const { data, pagination } = await response.json();

      // Solo procesamos la respuesta si es la petición más reciente y no fue cancelada
      if (requestId === requestIdRef.current && !controller.signal.aborted) {
        const newTotal = pagination?.total ?? 0;
        const newTotalPages = pagination?.totalPages ?? 1;

        // Si la página actual está fuera de rango (ej: eliminamos el último item de la última página),
        // navegamos a la última página válida
        const lastValidPage = newTotalPages === 0 ? 1 : newTotalPages;

        if (currentPage > lastValidPage) {
          setTotal(newTotal);
          setTotalPages(newTotalPages);
          const params = getLatestParams();

          params.set("page", String(lastValidPage));
          startTransition(() => replace(`${pathname}?${params.toString()}`));

          return; // No mostramos una página vacía; esperamos a que se recargue con la nueva URL
        }

        // Actualizamos el estado con los datos recibidos
        setList(data);
        setTotal(newTotal);
        setTotalPages(newTotalPages);
        setIsLoading(false);
      }
    } catch (error: any) {
      // Si el error no es por cancelación (AbortError), lo manejamos
      if (error?.name !== "AbortError") {
        if (requestId === requestIdRef.current) {
          setIsLoading(false);
        }
      }
    }
  }, [searchParams, pathname, replace, currentPage]);

  // Efecto que se ejecuta cada vez que cambian los parámetros de búsqueda (URL)
  // Esto recarga automáticamente los datos cuando el usuario cambia filtros, página, etc.
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Efecto para sincronizar el estado local de filtros con la URL
  // Esto se ejecuta cuando la URL cambia externamente (ej: botón atrás del navegador)
  useEffect(() => {
    setSelectedMets(
      new Set((searchParams.get("metodo")?.split(",") || []).filter(Boolean))
    );
    setSelectedStates(
      new Set((searchParams.get("estado")?.split(",") || []).filter(Boolean))
    );
  }, [searchParams]);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden p-6">
      {/* SECCIÓN 1: Barra de filtros - fija en la parte superior */}
      <div className="flex-none space-y-4 mb-4">
        {/* Componente con los controles de búsqueda y filtros */}
        <FiltersBar
          methodOptions={methodOptions}
          searchTerm={searchTerm}
          selectedMets={selectedMets}
          selectedStates={selectedStates}
          statusOptions={statusOptions}
          onClearSearch={() => {
            // Cuando se limpia la búsqueda
            setIsLoading(true);
            setSearchTerm("");
            const params = getLatestParams();

            params.delete("search");
            // Volver a la página 1 al limpiar la búsqueda
            params.set("page", "1");

            startTransition(() => replace(`${pathname}?${params.toString()}`));
          }}
          onKeyDown={handleKeyDown}
          onMethodsChange={handleMethodChange}
          onSearch={handleSearch}
          onSearchChange={handleSearchChange}
          onStatesChange={handleStatusChange}
        />

        {/* Componente que muestra los filtros activos como chips/badges */}
        <ActiveFilters
          methodOptions={methodOptions}
          selectedMets={selectedMets}
          selectedStates={selectedStates}
          statusOptions={statusOptions}
          onClearAll={clearFilters}
          onRemoveEstado={(estado: string) => {
            // Cuando se elimina un filtro de estado
            const newEstados = Array.from(selectedStates).filter(
              (s) => s !== estado
            );

            setSelectedStates(new Set(newEstados));
            updateFilter("estado", newEstados);
          }}
          onRemoveMetodo={(metodo: string) => {
            // Cuando se elimina un filtro de método
            const newMethods = Array.from(selectedMets).filter(
              (s) => s !== metodo
            );

            setSelectedMets(new Set(newMethods));
            updateFilter("metodo", newMethods);
          }}
        />
      </div>

      {/* SECCIÓN 2: Tabla de datos - con scroll */}
      <div className="flex-1 min-h-0 overflow-auto">
        <OrderDataTable
          items={list}
          loading={loading}
          sortDescriptor={sortDescriptor}
          onDelete={async (id: string) => {
            // Cuando se hace clic en eliminar un pedido
            setDeletingId(id);
            setConfirmOpen(true);
          }}
          onEdit={(item) => {
            // Cuando se hace clic en editar los productos de un pedido
            setEditingOrderDetails(item);
            setEditDetailsOpen(true);
          }}
          onSortChange={handleSortChange}
          onViewDetails={(item) => {
            // Cuando se hace clic en ver los detalles de un pedido
            setViewingOrder(item);
            setDetailsOpen(true);
          }}
        />
      </div>

      {/* SECCIÓN 3: Paginación y acciones - fija en la parte inferior */}
      <div className="flex-none pt-4 border-t border-divider">
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center">
          {/* Izquierda: contador de resultados */}
          <div className="text-sm text-default-500 w-full text-center sm:text-left sm:flex-1">
            Mostrando {total === 0 ? 0 : (currentPage - 1) * limit + 1}–
            {Math.min(total, currentPage * limit)} de {total} pedidos
          </div>
          {/* Centro: controles de paginación */}
          <div className="w-full sm:flex-1 flex justify-center">
            <Pagination
              isCompact
              showControls
              page={currentPage}
              total={Math.max(totalPages, 1)}
              onChange={(page) => {
                // Cuando el usuario cambia de página
                setIsLoading(true);
                const params = getLatestParams();

                params.set("page", String(page));

                startTransition(() =>
                  replace(`${pathname}?${params.toString()}`)
                );
              }}
            />
          </div>
          {/* Derecha: botón para agregar pedido (solo en escritorio) */}
          <div className="w-full sm:flex-1 flex justify-end">
            <Button
              className="hidden sm:inline-flex"
              color="primary"
              onPress={() => {
                // Abrir el formulario en modo crear
                setFormMode("create");
                setEditing(null);
                setFormOpen(true);
              }}
            >
              Añadir pedido
            </Button>
          </div>
        </div>
      </div>

      {/* MODAL: Formulario para crear/editar pedido */}
      <OrderForm
        initial={editing ?? undefined}
        isOpen={formOpen}
        mode={formMode}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          // Recargar los datos inmediatamente después de crear o editar
          fetchData();
        }}
      />

      {/* MODAL: Diálogo de confirmación para eliminar pedido */}
      <ConfirmDialog
        cancelText="Cancelar"
        confirmText="Eliminar"
        description={
          deletingId
            ? `¿Seguro que deseas eliminar el pedido ${deletingId}?`
            : undefined
        }
        isLoading={deleting}
        isOpen={confirmOpen}
        title="Eliminar pedido"
        variant="danger"
        onCancel={() => {
          // Cuando el usuario cancela la eliminación
          setConfirmOpen(false);
          setDeletingId(null);
        }}
        onConfirm={async () => {
          // Cuando el usuario confirma la eliminación
          if (!deletingId) return;

          setDeleting(true);
          setIsLoading(true);
          try {
            // Enviamos la petición DELETE a la API
            const res = await fetch(
              `/api/orders/${encodeURIComponent(deletingId)}`,
              { method: "DELETE" }
            );

            if (res.ok) {
              // Si acabamos de eliminar el único item de la última página,
              // volvemos a la página anterior
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
                // Si no, simplemente recargamos los datos
                await fetchData();
              }
            }
          } finally {
            // Limpiamos los estados de eliminación
            setDeleting(false);
            setConfirmOpen(false);
            setDeletingId(null);
            // Si la petición falló, quitamos el estado de carga
            setIsLoading(false);
          }
        }}
        onOpenChange={(open) => {
          // Cuando el modal se cierra de cualquier forma
          if (!open) {
            setConfirmOpen(false);
            setDeletingId(null);
          }
        }}
      />

      {/* MODAL: Ver detalles completos de un pedido (solo lectura) */}
      <OrderDetailsModal
        isOpen={detailsOpen}
        order={viewingOrder}
        onClose={() => {
          setDetailsOpen(false);
          setViewingOrder(null);
        }}
      />

      {/* MODAL: Editar detalles/productos de un pedido */}
      <OrderDetailsModal
        editable // Indica que este modal permite editar
        isOpen={editDetailsOpen}
        order={editingOrderDetails}
        onClose={() => {
          setEditDetailsOpen(false);
          setEditingOrderDetails(null);
          // Refrescar la lista después de editar
          fetchData();
        }}
      />

      {/* BOTÓN FLOTANTE: Para agregar pedido en móviles */}
      {/* Este botón solo se muestra en pantallas pequeñas (móviles) */}
      <Button
        isIconOnly
        aria-label="Añadir producto"
        className="sm:hidden fixed bottom-6 right-6 z-50 shadow-xl rounded-full h-16 w-16"
        color="primary"
        size="lg"
        onPress={() => {
          // Abrir el formulario en modo crear
          setFormMode("create");
          setEditing(null);
          setFormOpen(true);
        }}
      >
        <Plus className="h-6 w-6" />
      </Button>
    </div>
  );
}
