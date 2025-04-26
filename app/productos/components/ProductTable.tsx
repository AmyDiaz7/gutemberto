"use client";
import type { Product } from "@/lib/types/database";

import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  getKeyValue,
  Spinner,
  SortDescriptor,
  Select,
  SelectItem,
  Button,
  Chip,
  Input,
} from "@heroui/react";
import clsx from "clsx";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { FilterIcon, X, Search } from "lucide-react";

const columns = [
  {
    key: "sku",
    label: "SKU",
    width: "20%",
  },
  {
    key: "nombre",
    label: "Nombre",
    width: "35%",
  },
  {
    key: "precio",
    label: "Precio",
    width: "10%",
  },
  {
    key: "stock",
    label: "Stock",
    width: "10%",
  },
  {
    key: "categoria",
    label: "Categoría",
    width: "10%",
  },
  {
    key: "estado",
    label: "Estado",
    width: "15%",
  },
];

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

  const { replace } = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Parse comma-separated values from URL params
  const selectedCategories = searchParams.get("categoria")?.split(",") || [];
  const selectedEstados = searchParams.get("estado")?.split(",") || [];
  const currentSearch = searchParams.get("search") || "";

  // Set initial search term from URL
  useEffect(() => {
    setSearchTerm(currentSearch);
  }, [currentSearch]);

  // Get sort params
  const sortColumn = searchParams.get("sort") || "sku";
  const sortDirection = searchParams.get("order") || "ascending";

  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: sortColumn,
    direction: sortDirection as "ascending" | "descending",
  });

  // Update URL with comma-separated filter values
  const updateFilter = (key: string, values: string[]) => {
    setIsLoading(true);
    const params = new URLSearchParams(searchParams.toString());

    if (values.length > 0) {
      params.set(key, values.join(","));
    } else {
      params.delete(key);
    }

    replace(`${pathname}?${params.toString()}`);
  };

  // Handle sort change
  const handleSortChange = (descriptor: SortDescriptor) => {
    setIsLoading(true);
    const params = new URLSearchParams(searchParams);

    if (descriptor.column) {
      params.set("sort", descriptor.column.toString());
    } else {
      params.delete("sort");
    }

    if (descriptor.direction) {
      params.set("order", descriptor.direction);
    } else {
      params.delete("order");
    }

    replace(`${pathname}?${params.toString()}`);
    setSortDescriptor(descriptor);
  };

  // Handle removing a category
  const handleRemoveCategory = (category: string) => {
    const newCategories = selectedCategories.filter((c) => c !== category);

    updateFilter("categoria", newCategories);
  };

  // Handle status selection changes with multiple possible values
  const handleStatusChange = (keys: Set<any> | string) => {
    const selectedValues =
      keys === "all" ? Object.keys(statusOptions) : Array.from(keys);

    updateFilter("estado", selectedValues);
  };

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  // Handle search submission
  const handleSearch = () => {
    setIsLoading(true);
    const params = new URLSearchParams(searchParams.toString());

    if (searchTerm.trim()) {
      params.set("search", searchTerm.trim());
    } else {
      params.delete("search");
    }

    replace(`${pathname}?${params.toString()}`);
  };

  // Handle Enter key in search field
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  // Clear all filters - update to also clear search
  const clearFilters = () => {
    const params = new URLSearchParams(searchParams);

    params.delete("categoria");
    params.delete("estado");
    params.delete("search");
    replace(`${pathname}?${params.toString()}`);
    setSearchTerm("");
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
        console.error("Error fetching categories:", error);
      } finally {
        setIsLoadingCategories(false);
      }
    };

    fetchCategories();
  }, []);

  // Fetch data whenever search params change
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);

      const response = await fetch(`/api/data?${searchParams.toString()}`);
      const { data } = await response.json();

      setList(data);
      setIsLoading(false);
    };

    fetchData();
  }, [searchParams]);

  // Render active filters
  const renderActiveFilters = () => {
    const hasFilters =
      selectedCategories.length > 0 || selectedEstados.length > 0;

    if (!hasFilters) return null;

    return (
      <div className="flex flex-wrap gap-4 mb-4">
        {selectedCategories.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-500">Categorías:</span>
            <div className="flex flex-wrap gap-1">
              {selectedCategories.map((category) => (
                <Chip
                  key={`cat-${category}`}
                  color="primary"
                  size="sm"
                  variant="flat"
                  onClose={() => handleRemoveCategory(category)}
                >
                  {category}
                </Chip>
              ))}
            </div>
          </div>
        )}

        {selectedEstados.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-500">Estados:</span>
            <div className="flex flex-wrap gap-1">
              {selectedEstados.map((estado) => {
                const label = statusOptions[estado];

                return (
                  <Chip
                    key={`estado-${estado}`}
                    color="secondary"
                    size="sm"
                    variant="flat"
                    onClose={() => {
                      const newEstados = selectedEstados.filter(
                        (s) => s !== estado
                      );

                      updateFilter("estado", newEstados);
                    }}
                  >
                    {label}
                  </Chip>
                );
              })}
            </div>
          </div>
        )}

        <Button
          color="danger"
          size="sm"
          startContent={<X size={14} />}
          variant="flat"
          onPress={clearFilters}
        >
          Limpiar filtros
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-4 w-full">
      {/* Search bar */}
      <div className="w-full flex gap-2">
        <Input
          classNames={{
            base: "w-full sm:max-w-md",
            inputWrapper: "shadow-none",
          }}
          placeholder="Buscar por nombre o SKU..."
          size="md"
          startContent={<Search size={18} className="text-default-300" />}
          type="search"
          value={searchTerm}
          variant="bordered"
          onKeyDown={handleKeyDown}
          onChange={handleSearchChange}
        />
        <Button color="primary" size="md" onPress={handleSearch}>
          Buscar
        </Button>
      </div>

      {/* Filters section */}
      <div className="flex flex-wrap gap-4 mb-4 items-center">
        <div className="flex items-center gap-2">
          <FilterIcon size={16} />
          <span className="text-sm font-medium">Filtrar por:</span>
        </div>

        {/* Category filter with autocomplete */}
        <Select
          classNames={{
            label: "text-default-foreground",
            base: "max-w-xs",
            value: "text-default-foreground",
          }}
          isDisabled={isLoadingCategories}
          label={
            isLoadingCategories ? (
              <div className="flex items-center gap-2">
                <span>Cargando</span>
                <Spinner size="sm" variant="dots" />
              </div>
            ) : (
              "Categorías"
            )
          }
          renderValue={(items) => {
            const count = items.length;

            return `${count} ${count === 1 ? "seleccionada" : "seleccionadas"}`;
          }}
          size="sm"
          selectedKeys={new Set(selectedCategories)}
          selectionMode="multiple"
          onSelectionChange={(keys: string | Set<any>) => {
            const selectedValues =
              keys === "all" ? Object.keys(categories) : Array.from(keys);

            updateFilter("categoria", selectedValues);
          }}
        >
          {categories.map((cat) => (
            <SelectItem key={cat}>{cat}</SelectItem>
          ))}
        </Select>

        {/* Status filter with multi-select */}
        <Select
          classNames={{
            label: "text-default-foreground",
            base: "max-w-xs",
            value: "text-default-foreground",
          }}
          size="sm"
          label="Estados"
          renderValue={(items) => {
            const count = items.length;

            return `${count} ${count === 1 ? "seleccionado" : "seleccionados"}`;
          }}
          selectedKeys={new Set(selectedEstados)}
          selectionMode="multiple"
          onSelectionChange={handleStatusChange}
        >
          {Object.entries(statusOptions).map(([value, label]) => (
            <SelectItem key={value}>{label}</SelectItem>
          ))}
        </Select>
      </div>

      {renderActiveFilters()}

      <Table
        isHeaderSticky
        isStriped
        aria-label="Tabla de productos"
        classNames={{
          td: clsx("transition-opacity", { "opacity-30": isLoading }),
        }}
        selectionMode="single"
        sortDescriptor={sortDescriptor}
        onRowAction={(key) => alert(key)}
        onSortChange={handleSortChange}
      >
        <TableHeader columns={columns}>
          {(column) => (
            <TableColumn
              key={column.key}
              allowsSorting
              width={column.width as any}
            >
              {column.label}
            </TableColumn>
          )}
        </TableHeader>
        <TableBody
          emptyContent="No se encontraron productos..."
          isLoading={isLoading}
          items={list}
          loadingContent={<Spinner label="Cargando..." />}
        >
          {(item: Product) => (
            <TableRow key={item.sku}>
              {(columnKey) => (
                <TableCell>
                  {columnKey === "estado" ? (
                    <span
                      className={clsx(
                        "px-2 py-1 text-xs font-semibold rounded-full",
                        {
                          "bg-green-100 text-green-800":
                            item.estado === "disponible",
                          "bg-red-100 text-red-800": item.estado === "agotado",
                          "bg-yellow-100 text-yellow-800":
                            item.estado === "descontinuado",
                        }
                      )}
                    >
                      {item.estado.charAt(0).toUpperCase() +
                        item.estado.slice(1)}
                    </span>
                  ) : columnKey === "precio" ? (
                    `$ ${getKeyValue(item, columnKey).toLocaleString("es-CO", {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })}`
                  ) : (
                    getKeyValue(item, columnKey)
                  )}
                </TableCell>
              )}
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
