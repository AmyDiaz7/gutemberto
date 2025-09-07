"use client";

import type React from "react";

import { Button, Input, Select, SelectItem, Spinner } from "@heroui/react";
import { FilterIcon, Search } from "lucide-react";

type FiltersBarProps = {
  categories: string[];
  isLoadingCategories: boolean;
  searchTerm: string;
  selectedCats: Set<string>;
  selectedStates: Set<string>;
  statusOptions: Record<string, string>;
  onCategoriesChange: (keys: string | Set<any>) => void;
  onStatesChange: (keys: string | Set<any>) => void;
  onSearch: () => void;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onClearSearch: () => void;
};

export default function FiltersBar(props: FiltersBarProps) {
  const {
    categories,
    isLoadingCategories,
    onCategoriesChange,
    onStatesChange,
    onSearch,
    onSearchChange,
    onKeyDown,
    onClearSearch,
    searchTerm,
    selectedCats,
    selectedStates,
    statusOptions,
  } = props;

  return (
    <div className="flex flex-wrap gap-4 mb-4 items-center">
      <div className="flex items-center gap-2 order-2 2xl:order-none">
        <FilterIcon size={16} />
        <span className="text-sm font-medium">Filtrar por:</span>
      </div>

      {/* Category filter */}
      <Select
        className="order-2 2xl:order-none"
        classNames={{
          label: "text-default-foreground",
          base: "w-full lg:max-w-xs",
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
        selectedKeys={selectedCats}
        selectionMode="multiple"
        size="sm"
        onSelectionChange={onCategoriesChange}
      >
        {categories.map((cat) => (
          <SelectItem key={cat}>{cat}</SelectItem>
        ))}
      </Select>

      {/* Status filter */}
      <Select
        className="order-2 2xl:order-none"
        classNames={{
          label: "text-default-foreground",
          base: "w-full lg:max-w-xs",
          value: "text-default-foreground",
        }}
        label="Estados"
        renderValue={(items) => {
          const count = items.length;

          return `${count} ${count === 1 ? "seleccionado" : "seleccionados"}`;
        }}
        selectedKeys={selectedStates}
        selectionMode="multiple"
        size="sm"
        onSelectionChange={onStatesChange}
      >
        {Object.entries(statusOptions).map(([value, label]) => (
          <SelectItem key={value}>{label}</SelectItem>
        ))}
      </Select>

      {/* Search bar */}
      <div className="order-1 2xl:order-none basis-full 2xl:basis-1/3 ml-0 2xl:ml-auto w-full 2xl:w-auto flex gap-2">
        <Input
          isClearable
          classNames={{ base: "w-full", inputWrapper: "shadow-none" }}
          placeholder="Buscar por nombre o SKU..."
          size="md"
          startContent={<Search className="text-default-300" size={18} />}
          type="search"
          value={searchTerm}
          variant="bordered"
          onChange={onSearchChange}
          onClear={onClearSearch}
          onKeyDown={onKeyDown}
        />
        <Button
          className="shrink-0"
          color="primary"
          size="md"
          onPress={onSearch}
        >
          Buscar
        </Button>
      </div>
    </div>
  );
}
