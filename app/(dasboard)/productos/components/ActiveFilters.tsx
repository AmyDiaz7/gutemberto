// Esta directiva indica que este componente se ejecuta en el navegador del cliente
"use client";

// Importamos los componentes de interfaz que usaremos (Button y Chip son etiquetas/botones)
import { Button, Chip } from "@heroui/react";
// Importamos el ícono X que usaremos en el botón de limpiar filtros
import { X } from "lucide-react";

// Definimos el tipo de datos que este componente recibirá como props (propiedades)
type ActiveFiltersProps = {
  selectedCats: Set<string>; // Conjunto de categorías seleccionadas (Set evita duplicados)
  selectedStates: Set<string>; // Conjunto de estados seleccionados
  statusOptions: Record<string, string>; // Diccionario que traduce códigos de estado a nombres legibles
  onRemoveCategory: (category: string) => void; // Función que se ejecuta al eliminar una categoría
  onRemoveEstado: (estado: string) => void; // Función que se ejecuta al eliminar un estado
  onClearAll: () => void; // Función que se ejecuta al limpiar todos los filtros
};

// Componente principal que muestra los filtros activos
export default function ActiveFilters({
  onClearAll, // Función para limpiar todos los filtros
  onRemoveCategory, // Función para eliminar una categoría específica
  onRemoveEstado, // Función para eliminar un estado específico
  selectedCats, // Categorías que están seleccionadas actualmente
  selectedStates, // Estados que están seleccionados actualmente
  statusOptions, // Diccionario para traducir códigos de estado
}: ActiveFiltersProps) {
  // Verificamos si hay algún filtro activo (categorías o estados)
  const hasFilters = selectedCats.size > 0 || selectedStates.size > 0;

  // Si no hay filtros activos, no mostramos nada (retornamos null)
  if (!hasFilters) return null;

  return (
    // Contenedor principal con diseño flexible que permite que los elementos se ajusten
    <div className="flex flex-wrap gap-4 mb-4">
      {/* Sección de categorías - solo se muestra si hay categorías seleccionadas */}
      {selectedCats.size > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {/* Etiqueta que dice "Categorías:" */}
          <span className="text-sm text-gray-500">Categorías:</span>
          {/* Contenedor de los chips (etiquetas) de categorías */}
          <div className="flex flex-wrap gap-1">
            {/* Convertimos el Set a Array y creamos un Chip por cada categoría */}
            {Array.from(selectedCats).map((category) => (
              <Chip
                key={`cat-${category}`} // Identificador único para React
                color="primary" // Color azul primario
                size="sm" // Tamaño pequeño
                variant="flat" // Estilo plano (no elevado)
                onClose={() => onRemoveCategory(category)} // Al hacer clic en X, elimina esta categoría
              >
                {category} {/* Texto que se muestra en el chip */}
              </Chip>
            ))}
          </div>
        </div>
      )}

      {/* Sección de estados - solo se muestra si hay estados seleccionados */}
      {selectedStates.size > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {/* Etiqueta que dice "Estados:" */}
          <span className="text-sm text-gray-500">Estados:</span>
          {/* Contenedor de los chips (etiquetas) de estados */}
          <div className="flex flex-wrap gap-1">
            {/* Convertimos el Set a Array y creamos un Chip por cada estado */}
            {Array.from(selectedStates).map((estado) => (
              <Chip
                key={`estado-${estado}`} // Identificador único para React
                color="primary" // Color azul primario
                size="sm" // Tamaño pequeño
                variant="flat" // Estilo plano (no elevado)
                onClose={() => onRemoveEstado(estado)} // Al hacer clic en X, elimina este estado
              >
                {/* Mostramos el nombre legible del estado usando el diccionario statusOptions */}
                {statusOptions[estado]}
              </Chip>
            ))}
          </div>
        </div>
      )}

      {/* Botón para limpiar todos los filtros a la vez */}
      <Button
        color="danger" // Color rojo para indicar acción de eliminar
        size="sm" // Tamaño pequeño
        startContent={<X size={14} />} // Ícono X al inicio del botón
        variant="flat" // Estilo plano (no elevado)
        onPress={onClearAll} // Al hacer clic, ejecuta la función que limpia todos los filtros
      >
        Limpiar filtros
      </Button>
    </div>
  );
}
