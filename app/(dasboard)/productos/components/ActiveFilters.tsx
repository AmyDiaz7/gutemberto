"use client";

import { Button, Chip } from "@heroui/react";
import { X } from "lucide-react";

type ActiveFiltersProps = {
  selectedCats: Set<string>;
  selectedStates: Set<string>;
  statusOptions: Record<string, string>;
  onRemoveCategory: (category: string) => void;
  onRemoveEstado: (estado: string) => void;
  onClearAll: () => void;
};

export default function ActiveFilters({
  onClearAll,
  onRemoveCategory,
  onRemoveEstado,
  selectedCats,
  selectedStates,
  statusOptions,
}: ActiveFiltersProps) {
  const hasFilters = selectedCats.size > 0 || selectedStates.size > 0;

  if (!hasFilters) return null;

  return (
    <div className="flex flex-wrap gap-4 mb-4">
      {selectedCats.size > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-500">Categorías:</span>
          <div className="flex flex-wrap gap-1">
            {Array.from(selectedCats).map((category) => (
              <Chip
                key={`cat-${category}`}
                color="primary"
                size="sm"
                variant="flat"
                onClose={() => onRemoveCategory(category)}
              >
                {category}
              </Chip>
            ))}
          </div>
        </div>
      )}

      {selectedStates.size > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-500">Estados:</span>
          <div className="flex flex-wrap gap-1">
            {Array.from(selectedStates).map((estado) => (
              <Chip
                key={`estado-${estado}`}
                color="primary"
                size="sm"
                variant="flat"
                onClose={() => onRemoveEstado(estado)}
              >
                {statusOptions[estado]}
              </Chip>
            ))}
          </div>
        </div>
      )}

      <Button
        color="danger"
        size="sm"
        startContent={<X size={14} />}
        variant="flat"
        onPress={onClearAll}
      >
        Limpiar filtros
      </Button>
    </div>
  );
}
