// Indicamos que este componente se ejecuta en el navegador (lado del cliente)
"use client";

// Importamos componentes de la librería HeroUI para la interfaz
import { Button, Chip } from "@heroui/react";
// Importamos el ícono X de lucide-react para el botón de limpiar
import { X } from "lucide-react";

// Definimos el tipo de las propiedades (props) que recibe este componente
type ActiveFiltersProps = {
  selectedMets: Set<string>; // Conjunto de métodos de pago seleccionados
  selectedStates: Set<string>; // Conjunto de estados seleccionados
  statusOptions: Record<string, string>; // Diccionario con los nombres de los estados
  methodOptions: Record<string, string>; // Diccionario con los nombres de los métodos
  onRemoveMetodo: (metodo: string) => void; // Función para eliminar un método
  onRemoveEstado: (estado: string) => void; // Función para eliminar un estado
  onClearAll: () => void; // Función para limpiar todos los filtros
};

// Componente que muestra los filtros activos aplicados a los pedidos
export default function ActiveFilters({
  onClearAll,
  onRemoveMetodo,
  onRemoveEstado,
  selectedMets,
  selectedStates,
  statusOptions,
  methodOptions,
}: ActiveFiltersProps) {
  // Verificamos si hay algún filtro activo (métodos o estados seleccionados)
  const hasFilters = selectedMets.size > 0 || selectedStates.size > 0;

  // Si no hay filtros activos, no mostramos nada (retornamos null)
  if (!hasFilters) return null;

  return (
    // Contenedor principal con diseño flexible que ajusta elementos en múltiples líneas
    <div className="flex flex-wrap gap-4 mb-4">
      {/* Mostramos la sección de métodos solo si hay métodos seleccionados */}
      {selectedMets.size > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {/* Etiqueta que indica la sección de métodos */}
          <span className="text-sm text-gray-500">Métodos:</span>
          <div className="flex flex-wrap gap-1">
            {/* Convertimos el Set a Array y recorremos cada método seleccionado */}
            {Array.from(selectedMets).map((metodo) => (
              // Chip es una etiqueta visual que muestra cada método
              <Chip
                key={`metodo-${metodo}`} // Clave única para cada elemento
                color="primary" // Color del chip
                size="sm" // Tamaño pequeño
                variant="flat" // Estilo plano
                onClose={() => onRemoveMetodo(metodo)} // Al cerrar, elimina este método
              >
                {/* Mostramos el nombre legible del método */}
                {methodOptions[metodo]}
              </Chip>
            ))}
          </div>
        </div>
      )}

      {/* Mostramos la sección de estados solo si hay estados seleccionados */}
      {selectedStates.size > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {/* Etiqueta que indica la sección de estados */}
          <span className="text-sm text-gray-500">Estados:</span>
          <div className="flex flex-wrap gap-1">
            {/* Convertimos el Set a Array y recorremos cada estado seleccionado */}
            {Array.from(selectedStates).map((estado) => (
              // Chip es una etiqueta visual que muestra cada estado
              <Chip
                key={`estado-${estado}`} // Clave única para cada elemento
                color="primary" // Color del chip
                size="sm" // Tamaño pequeño
                variant="flat" // Estilo plano
                onClose={() => onRemoveEstado(estado)} // Al cerrar, elimina este estado
              >
                {/* Mostramos el nombre legible del estado */}
                {statusOptions[estado]}
              </Chip>
            ))}
          </div>
        </div>
      )}

      {/* Botón para limpiar todos los filtros a la vez */}
      <Button
        color="danger" // Color rojo para indicar acción de eliminación
        size="sm" // Tamaño pequeño
        startContent={<X size={14} />} // Ícono X al inicio del botón
        variant="flat" // Estilo plano
        onPress={onClearAll} // Al presionar, ejecuta la función de limpiar todo
      >
        Limpiar filtros
      </Button>
    </div>
  );
}
