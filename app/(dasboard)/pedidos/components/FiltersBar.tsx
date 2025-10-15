"use client";

import type React from "react";

import { Select, SelectItem } from "@heroui/react";
import { FilterIcon } from "lucide-react";

type FiltersBarProps = {
  searchTerm: string;
  selectedMets: Set<string>;
  selectedStates: Set<string>;
  statusOptions: Record<string, string>;
  methodOptions: Record<string, string>;
  onMethodsChange: (keys: string | Set<any>) => void;
  onStatesChange: (keys: string | Set<any>) => void;
  onSearch: () => void;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onClearSearch: () => void;
};

export default function FiltersBar(props: FiltersBarProps) {
  const {
    onMethodsChange,
    onStatesChange,
    onSearch,
    onSearchChange,
    onKeyDown,
    onClearSearch,
    searchTerm,
    selectedMets,
    selectedStates,
    statusOptions,
    methodOptions,
  } = props;

  return (
    <div className="flex flex-wrap gap-4 mb-4 items-center">
      <div className="flex items-center gap-2 order-2 2xl:order-none">
        <FilterIcon size={16} />
        <span className="text-sm font-medium">Filtrar por:</span>
      </div>

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

      {/* Category filter */}
      <Select
        className="order-2 2xl:order-none"
        classNames={{
          label: "text-default-foreground",
          base: "w-full lg:max-w-xs",
          value: "text-default-foreground",
        }}
        label="Métodos"
        renderValue={(items) => {
          const count = items.length;

          return `${count} ${count === 1 ? "seleccionado" : "seleccionados"}`;
        }}
        selectedKeys={selectedMets}
        selectionMode="multiple"
        size="sm"
        onSelectionChange={onMethodsChange}
      >
        {Object.entries(methodOptions).map(([value, label]) => (
          <SelectItem key={value}>{label}</SelectItem>
        ))}
      </Select>
    </div>
  );
}
