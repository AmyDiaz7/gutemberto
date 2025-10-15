"use client";
import type { Order } from "@/lib/types/database";

import { Button, Pagination, SortDescriptor } from "@heroui/react";
import { Plus } from "lucide-react";
import { useState, useEffect, useTransition, useRef, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

import ActiveFilters from "./ActiveFilters";
import FiltersBar from "./FiltersBar";
import OrderDataTable from "./OrderDataTable";
import OrderForm from "./OrderForm";
import ConfirmDialog from "./ConfirmDialog";
import OrderDetailsModal from "./OrderDetailsModal";

const statusOptions: Record<string, string> = {
  pendiente: "Pendiente",
  pagado: "Pagado",
  bodega: "Bodega",
  transportando: "Transportando",
  entregado: "Entregado",
};

const methodOptions: Record<string, string> = {
  recoger: "Recoger",
  domicilio: "Domicilio",
};

export default function OrderTable() {
  const [isLoading, setIsLoading] = useState(true);
  const [list, setList] = useState<Order[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editing, setEditing] = useState<Order | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [editDetailsOpen, setEditDetailsOpen] = useState(false);
  const [editingOrderDetails, setEditingOrderDetails] = useState<Order | null>(
    null
  );

  const { replace } = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const loading = isLoading || isPending;

  // Track last request to ignore stale responses
  const requestIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  // Parse comma-separated values from URL params
  const selectedMetodos = searchParams.get("metodo")?.split(",") || [];
  const selectedEstados = searchParams.get("estado")?.split(",") || [];
  const currentSearch = searchParams.get("search") || "";

  // Local selected state for instant UI feedback
  const [selectedMets, setSelectedMets] = useState<Set<string>>(
    new Set(selectedMetodos.filter(Boolean))
  );
  const [selectedStates, setSelectedStates] = useState<Set<string>>(
    new Set(selectedEstados.filter(Boolean))
  );

  // Set initial search term from URL
  useEffect(() => {
    setSearchTerm(currentSearch);
  }, [currentSearch]);

  // Helpers to map sort order between UI (ascending/descending) and URL/API (asc/desc)
  const fromUrlOrder = (val?: string | null): "ascending" | "descending" => {
    const v = (val || "").toLowerCase();

    return v === "desc" || v === "descending" ? "descending" : "ascending";
  };
  const toUrlOrder = (val?: "ascending" | "descending") =>
    val === "descending" ? "desc" : "asc";

  // Get sort params
  const sortColumn = searchParams.get("sort") || "fecha";
  const sortDirection = fromUrlOrder(searchParams.get("order"));
  const currentPage = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");

  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: sortColumn,
    direction: sortDirection as "ascending" | "descending",
  });

  // Keep sortDescriptor in sync with URL to avoid desync on fast updates
  useEffect(() => {
    const col = searchParams.get("sort") || "fecha";
    const dir = fromUrlOrder(searchParams.get("order"));

    setSortDescriptor({ column: col, direction: dir });
  }, [searchParams]);

  // Use latest URL to avoid losing concurrent updates
  const getLatestParams = () =>
    new URLSearchParams(
      typeof window !== "undefined"
        ? window.location.search
        : searchParams.toString()
    );

  // Update URL with comma-separated filter values
  const updateFilter = (key: string, values: string[]) => {
    setIsLoading(true);
    const params = getLatestParams();

    if (values.length > 0) {
      params.set(key, values.join(","));
    } else {
      params.delete(key);
    }

    // reset pagination to first page when filters change
    params.set("page", "1");

    startTransition(() => replace(`${pathname}?${params.toString()}`));
  };

  // Handle sort change
  const handleSortChange = (descriptor: SortDescriptor) => {
    setIsLoading(true);
    const params = getLatestParams();

    if (descriptor.column) {
      params.set("sort", String(descriptor.column));
    } else {
      params.delete("sort");
    }

    if (descriptor.direction) {
      params.set("order", toUrlOrder(descriptor.direction));
    } else {
      params.delete("order");
    }

    // reset to first page when sorting changes
    params.set("page", "1");

    startTransition(() => replace(`${pathname}?${params.toString()}`));
    setSortDescriptor(descriptor);
  };

  // Handle removing a category
  const handleMethodChange = (keys: Set<any> | string) => {
    const selectedValues =
      keys === "all"
        ? Object.keys(methodOptions)
        : Array.from(keys as Set<string>);

    setSelectedStates(new Set(selectedValues));
    updateFilter("metodo", selectedValues);
  };

  // Handle status selection changes with multiple possible values
  const handleStatusChange = (keys: Set<any> | string) => {
    const selectedValues =
      keys === "all"
        ? Object.keys(statusOptions)
        : Array.from(keys as Set<string>);

    setSelectedStates(new Set(selectedValues));
    updateFilter("estado", selectedValues);
  };

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  // Handle search submission
  const handleSearch = () => {
    setIsLoading(true);
    const params = getLatestParams();

    if (searchTerm.trim()) {
      params.set("search", searchTerm.trim());
    } else {
      params.delete("search");
    }

    // reset to first page when search changes
    params.set("page", "1");

    startTransition(() => replace(`${pathname}?${params.toString()}`));
  };

  // Handle Enter key in search field
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  // Clear all filters - update to also clear search
  const clearFilters = () => {
    const params = getLatestParams();

    // Only clear filters; keep current search text intact to avoid interference
    params.delete("metodo");
    params.delete("estado");
    params.set("page", "1");

    startTransition(() => replace(`${pathname}?${params.toString()}`));
  };

  // Fetch data (reusable) and cancel stale requests
  const fetchData = useCallback(async () => {
    setIsLoading(true);

    // cancel previous in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();

    abortRef.current = controller;

    const requestId = ++requestIdRef.current;
    const url = `/api/orders/data?${searchParams.toString()}`;

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
    setSelectedMets(
      new Set((searchParams.get("metodo")?.split(",") || []).filter(Boolean))
    );
    setSelectedStates(
      new Set((searchParams.get("estado")?.split(",") || []).filter(Boolean))
    );
  }, [searchParams]);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden p-6">
      {/* Filters section - fixed at top */}
      <div className="flex-none space-y-4 mb-4">
        <FiltersBar
          methodOptions={methodOptions}
          searchTerm={searchTerm}
          selectedMets={selectedMets}
          selectedStates={selectedStates}
          statusOptions={statusOptions}
          onClearSearch={() => {
            setIsLoading(true);
            setSearchTerm("");
            const params = getLatestParams();

            params.delete("search");
            // Reset to first page when clearing a search
            params.set("page", "1");

            startTransition(() => replace(`${pathname}?${params.toString()}`));
          }}
          onKeyDown={handleKeyDown}
          onMethodsChange={handleMethodChange}
          onSearch={handleSearch}
          onSearchChange={handleSearchChange}
          onStatesChange={handleStatusChange}
        />

        <ActiveFilters
          methodOptions={methodOptions}
          selectedMets={selectedMets}
          selectedStates={selectedStates}
          statusOptions={statusOptions}
          onClearAll={clearFilters}
          onRemoveEstado={(estado: string) => {
            const newEstados = Array.from(selectedStates).filter(
              (s) => s !== estado
            );

            setSelectedStates(new Set(newEstados));
            updateFilter("estado", newEstados);
          }}
          onRemoveMetodo={(metodo: string) => {
            const newMethods = Array.from(selectedMets).filter(
              (s) => s !== metodo
            );

            setSelectedMets(new Set(newMethods));
            updateFilter("metodo", newMethods);
          }}
        />
      </div>

      {/* Table section - scrollable */}
      <div className="flex-1 min-h-0 overflow-auto">
        <OrderDataTable
          items={list}
          loading={loading}
          sortDescriptor={sortDescriptor}
          onDelete={async (id: string) => {
            setDeletingId(id);
            setConfirmOpen(true);
          }}
          onEdit={(item) => {
            setEditingOrderDetails(item);
            setEditDetailsOpen(true);
          }}
          onSortChange={handleSortChange}
          onViewDetails={(item) => {
            setViewingOrder(item);
            setDetailsOpen(true);
          }}
        />
      </div>

      {/* Pagination + Actions row - fixed at bottom */}
      <div className="flex-none pt-4 border-t border-divider">
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center">
          {/* Left: results count */}
          <div className="text-sm text-default-500 w-full text-center sm:text-left sm:flex-1">
            Mostrando {total === 0 ? 0 : (currentPage - 1) * limit + 1}–
            {Math.min(total, currentPage * limit)} de {total} pedidos
          </div>
          {/* Middle: pagination */}
          <div className="w-full sm:flex-1 flex justify-center">
            <Pagination
              isCompact
              showControls
              page={currentPage}
              total={Math.max(totalPages, 1)}
              onChange={(page) => {
                setIsLoading(true);
                const params = getLatestParams();

                params.set("page", String(page));

                startTransition(() =>
                  replace(`${pathname}?${params.toString()}`)
                );
              }}
            />
          </div>
          {/* Right: add button (desktop only) */}
          <div className="w-full sm:flex-1 flex justify-end">
            <Button
              className="hidden sm:inline-flex"
              color="primary"
              onPress={() => {
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

      <OrderForm
        initial={editing ?? undefined}
        isOpen={formOpen}
        mode={formMode}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          // Refetch immediately after create/edit
          fetchData();
        }}
      />

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
          setConfirmOpen(false);
          setDeletingId(null);
        }}
        onConfirm={async () => {
          if (!deletingId) return;

          setDeleting(true);
          setIsLoading(true);
          try {
            const res = await fetch(
              `/api/orders/${encodeURIComponent(deletingId)}`,
              { method: "DELETE" }
            );

            if (res.ok) {
              // If we just deleted the only item on the last page, move to the previous page
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
                await fetchData();
              }
            }
          } finally {
            setDeleting(false);
            setConfirmOpen(false);
            setDeletingId(null);
            // If request failed, stop page loading state
            setIsLoading(false);
          }
        }}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmOpen(false);
            setDeletingId(null);
          }
        }}
      />

      <OrderDetailsModal
        isOpen={detailsOpen}
        order={viewingOrder}
        onClose={() => {
          setDetailsOpen(false);
          setViewingOrder(null);
        }}
      />

      <OrderDetailsModal
        editable
        isOpen={editDetailsOpen}
        order={editingOrderDetails}
        onClose={() => {
          setEditDetailsOpen(false);
          setEditingOrderDetails(null);
          // Refrescar la lista después de editar
          fetchData();
        }}
      />

      {/* Mobile floating action button */}
      <Button
        isIconOnly
        aria-label="Añadir producto"
        className="sm:hidden fixed bottom-6 right-6 z-50 shadow-xl rounded-full h-16 w-16"
        color="primary"
        size="lg"
        onPress={() => {
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
