// Indicamos que este componente se ejecuta en el navegador (lado del cliente)
"use client";

// Importamos el tipo React para usar en los tipos de eventos
import type React from "react";

// Importamos componentes de Select de HeroUI para crear menús desplegables
import { Select, SelectItem } from "@heroui/react";
// Importamos el ícono de filtro de lucide-react
import { FilterIcon } from "lucide-react";

// Definimos el tipo de las propiedades (props) que recibe este componente
type FiltersBarProps = {
  searchTerm: string; // Término de búsqueda actual (no se usa en este componente pero se recibe)
  selectedMets: Set<string>; // Conjunto de métodos de pago seleccionados
  selectedStates: Set<string>; // Conjunto de estados de pedido seleccionados
  statusOptions: Record<string, string>; // Diccionario con los estados disponibles (clave: valor interno, valor: texto a mostrar)
  methodOptions: Record<string, string>; // Diccionario con los métodos disponibles (clave: valor interno, valor: texto a mostrar)
  onMethodsChange: (keys: string | Set<any>) => void; // Función que se ejecuta cuando cambian los métodos seleccionados
  onStatesChange: (keys: string | Set<any>) => void; // Función que se ejecuta cuando cambian los estados seleccionados
  onSearch: () => void; // Función para ejecutar la búsqueda (no se usa en este componente)
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void; // Función cuando cambia el input de búsqueda (no se usa)
  onKeyDown: (e: React.KeyboardEvent) => void; // Función para eventos de teclado (no se usa)
  onClearSearch: () => void; // Función para limpiar la búsqueda (no se usa)
};

/**
 * Componente de barra de filtros para pedidos
 * Permite filtrar los pedidos por estado y método de pago
 */
export default function FiltersBar(props: FiltersBarProps) {
  // Desestructuramos las props para usarlas más fácilmente
  const {
    onMethodsChange, // Función para manejar cambios en métodos
    onStatesChange, // Función para manejar cambios en estados
    selectedMets, // Métodos actualmente seleccionados
    selectedStates, // Estados actualmente seleccionados
    statusOptions, // Opciones disponibles de estados
    methodOptions, // Opciones disponibles de métodos
  } = props;

  return (
    // Contenedor principal con diseño flexible que se ajusta en múltiples líneas
    <div className="flex flex-wrap gap-4 mb-4 items-center">
      {/* Encabezado con ícono y texto "Filtrar por:" */}
      <div className="flex items-center gap-2 order-2 2xl:order-none">
        <FilterIcon size={16} /> {/* Ícono de filtro */}
        <span className="text-sm font-medium">Filtrar por:</span>
      </div>

      {/* Selector de estados de pedidos (Pendiente, Completado, etc.) */}
      <Select
        className="order-2 2xl:order-none" // Orden visual en pantallas grandes
        classNames={{
          label: "text-default-foreground", // Color del texto de la etiqueta
          base: "w-full lg:max-w-xs", // Ancho completo en móvil, máximo xs en pantallas grandes
          value: "text-default-foreground", // Color del valor seleccionado
        }}
        label="Estados" // Etiqueta que se muestra encima del selector
        // Función personalizada para mostrar cuántos elementos están seleccionados
        renderValue={(items) => {
          const count = items.length; // Contamos cuántos items hay

          // Mostramos "1 seleccionado" o "2 seleccionados" según la cantidad
          return `${count} ${count === 1 ? "seleccionado" : "seleccionados"}`;
        }}
        selectedKeys={selectedStates} // Estados que están actualmente seleccionados
        selectionMode="multiple" // Permite seleccionar múltiples opciones
        size="sm" // Tamaño pequeño
        onSelectionChange={onStatesChange} // Función que se ejecuta cuando cambia la selección
      >
        {/* Recorremos todas las opciones de estado y creamos un item por cada una */}
        {Object.entries(statusOptions).map(([value, label]) => (
          <SelectItem key={value}>{label}</SelectItem>
        ))}
      </Select>

      {/* Selector de métodos de pago (Efectivo, Tarjeta, Transferencia, etc.) */}
      <Select
        className="order-2 2xl:order-none" // Orden visual en pantallas grandes
        classNames={{
          label: "text-default-foreground", // Color del texto de la etiqueta
          base: "w-full lg:max-w-xs", // Ancho completo en móvil, máximo xs en pantallas grandes
          value: "text-default-foreground", // Color del valor seleccionado
        }}
        label="Métodos" // Etiqueta que se muestra encima del selector
        // Función personalizada para mostrar cuántos elementos están seleccionados
        renderValue={(items) => {
          const count = items.length; // Contamos cuántos items hay

          // Mostramos "1 seleccionado" o "2 seleccionados" según la cantidad
          return `${count} ${count === 1 ? "seleccionado" : "seleccionados"}`;
        }}
        selectedKeys={selectedMets} // Métodos que están actualmente seleccionados
        selectionMode="multiple" // Permite seleccionar múltiples opciones
        size="sm" // Tamaño pequeño
        onSelectionChange={onMethodsChange} // Función que se ejecuta cuando cambia la selección
      >
        {/* Recorremos todas las opciones de método y creamos un item por cada una */}
        {Object.entries(methodOptions).map(([value, label]) => (
          <SelectItem key={value}>{label}</SelectItem>
        ))}
      </Select>
    </div>
  );
}
