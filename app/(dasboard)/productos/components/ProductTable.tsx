"use client";
import type { Product } from "@/lib/types/database";

import { Button, Pagination, SortDescriptor } from "@heroui/react";
import { useState, useEffect, useTransition, useRef, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

import ActiveFilters from "./ActiveFilters";
import FiltersBar from "./FiltersBar";
import ProductDataTable from "./ProductDataTable";
import ProductForm from "./ProductForm";
import ConfirmDialog from "./ConfirmDialog";

const statusOptions: Record<string, string> = {
  disponible: "Disponible",
  agotado: "Agotado",
  descontinuado: "Descontinuado",
};

export default function ProductTable() {
  const [isLoading, setIsLoading] = useState(true);
  const [list, setList] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editing, setEditing] = useState<Product | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingSku, setDeletingSku] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { replace } = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const loading = isLoading || isPending;

  // Track last request to ignore stale responses
  const requestIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  // Parse comma-separated values from URL params
  const selectedCategories = searchParams.get("categoria")?.split(",") || [];
  const selectedEstados = searchParams.get("estado")?.split(",") || [];
  const currentSearch = searchParams.get("search") || "";

  // Local selected state for instant UI feedback
  const [selectedCats, setSelectedCats] = useState<Set<string>>(
    new Set(selectedCategories.filter(Boolean))
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
  const sortColumn = searchParams.get("sort") || "sku";
  const sortDirection = fromUrlOrder(searchParams.get("order"));
  const currentPage = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");

  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: sortColumn,
    direction: sortDirection as "ascending" | "descending",
  });

  // Keep sortDescriptor in sync with URL to avoid desync on fast updates
  useEffect(() => {
    const col = searchParams.get("sort") || "sku";
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
  const handleRemoveCategory = (category: string) => {
    const newCategories = Array.from(selectedCats).filter(
      (c) => c !== category
    );

    setSelectedCats(new Set(newCategories));
    updateFilter("categoria", newCategories);
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
    params.delete("categoria");
    params.delete("estado");
    params.set("page", "1");

    startTransition(() => replace(`${pathname}?${params.toString()}`));
  };

  // Fetch categories once when component mounts
  useEffect(() => {
    const fetchCategories = async () => {
      setIsLoadingCategories(true);
      try {
        const response = await fetch("/api/categories");
        const data = await response.json();

        setCategories(data);
      } catch (error) {
        /* no-op */
      } finally {
        setIsLoadingCategories(false);
      }
    };

    fetchCategories();
  }, []);

  // Fetch data (reusable) and cancel stale requests
  const fetchData = useCallback(async () => {
    setIsLoading(true);

    // cancel previous in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();

    abortRef.current = controller;

    const requestId = ++requestIdRef.current;
    const url = `/api/data?${searchParams.toString()}`;

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

  return (
    <div className="space-y-4 w-full overflow-x-hidden p-6">
      <div className="flex justify-end">
        <Button
          color="primary"
          onPress={() => {
            setFormMode("create");
            setEditing(null);
            setFormOpen(true);
          }}
        >
          Añadir producto
        </Button>
      </div>
      <FiltersBar
        categories={categories}
        isLoadingCategories={isLoadingCategories}
        searchTerm={searchTerm}
        selectedCats={selectedCats}
        selectedStates={selectedStates}
        statusOptions={statusOptions}
        onCategoriesChange={(keys: string | Set<any>) => {
          const selectedValues =
            keys === "all" ? categories : Array.from(keys as Set<string>);

          setSelectedCats(new Set(selectedValues));
          updateFilter("categoria", selectedValues);
        }}
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
        onSearch={handleSearch}
        onSearchChange={handleSearchChange}
        onStatesChange={handleStatusChange}
      />

      <ActiveFilters
        selectedCats={selectedCats}
        selectedStates={selectedStates}
        statusOptions={statusOptions}
        onClearAll={clearFilters}
        onRemoveCategory={handleRemoveCategory}
        onRemoveEstado={(estado: string) => {
          const newEstados = Array.from(selectedStates).filter(
            (s) => s !== estado
          );

          setSelectedStates(new Set(newEstados));
          updateFilter("estado", newEstados);
        }}
      />

      <ProductDataTable
        items={list}
        loading={loading}
        sortDescriptor={sortDescriptor}
        onDelete={async (sku: string) => {
          setDeletingSku(sku);
          setConfirmOpen(true);
        }}
        onEdit={(item) => {
          setFormMode("edit");
          setEditing(item);
          setFormOpen(true);
        }}
        onSortChange={handleSortChange}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <div className="text-sm text-default-500">
            Mostrando {total === 0 ? 0 : (currentPage - 1) * limit + 1}–
            {Math.min(total, currentPage * limit)} de {total} productos
          </div>
          <Pagination
            isCompact
            showControls
            page={currentPage}
            total={totalPages}
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
      )}

      <ProductForm
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
          deletingSku
            ? `¿Seguro que deseas eliminar el producto ${deletingSku}?`
            : undefined
        }
        isLoading={deleting}
        isOpen={confirmOpen}
        title="Eliminar producto"
        variant="danger"
        onCancel={() => {
          setConfirmOpen(false);
          setDeletingSku(null);
        }}
        onConfirm={async () => {
          if (!deletingSku) return;

          setDeleting(true);
          setIsLoading(true);
          try {
            const res = await fetch(
              `/api/products/${encodeURIComponent(deletingSku)}`,
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
            setDeletingSku(null);
            // If request failed, stop page loading state
            setIsLoading(false);
          }
        }}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmOpen(false);
            setDeletingSku(null);
          }
        }}
      />
    </div>
  );
}
