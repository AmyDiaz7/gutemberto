// Esta directiva indica que este componente se ejecuta en el navegador del cliente
"use client";

// Importamos el tipo React para poder usarlo en las definiciones de tipos
import type React from "react";

// Importamos los componentes de interfaz que necesitamos
import { Button, Input, Select, SelectItem, Spinner } from "@heroui/react";
// Importamos los íconos que usaremos en la barra de filtros
import { FilterIcon, Search } from "lucide-react";

// Definimos el tipo de propiedades que este componente recibirá
type FiltersBarProps = {
  categories: string[]; // Lista de categorías disponibles para filtrar
  isLoadingCategories: boolean; // Indica si las categorías están cargando
  searchTerm: string; // Texto actual en el campo de búsqueda
  selectedCats: Set<string>; // Conjunto de categorías seleccionadas
  selectedStates: Set<string>; // Conjunto de estados seleccionados
  statusOptions: Record<string, string>; // Diccionario de opciones de estado (clave: valor, valor: etiqueta)
  onCategoriesChange: (keys: string | Set<any>) => void; // Función que se ejecuta al cambiar categorías
  onStatesChange: (keys: string | Set<any>) => void; // Función que se ejecuta al cambiar estados
  onSearch: () => void; // Función que se ejecuta al hacer clic en el botón de buscar
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void; // Función que se ejecuta al escribir en el campo de búsqueda
  onKeyDown: (e: React.KeyboardEvent) => void; // Función que se ejecuta al presionar una tecla (ej: Enter)
  onClearSearch: () => void; // Función que se ejecuta al limpiar el campo de búsqueda
};

// Componente principal que muestra la barra de filtros y búsqueda
export default function FiltersBar(props: FiltersBarProps) {
  // Desestructuramos las props para usar las variables directamente
  const {
    categories, // Lista de categorías disponibles
    isLoadingCategories, // Estado de carga de categorías
    onCategoriesChange, // Manejador de cambio de categorías
    onStatesChange, // Manejador de cambio de estados
    onSearch, // Manejador del botón buscar
    onSearchChange, // Manejador del campo de búsqueda
    onKeyDown, // Manejador de teclas presionadas
    onClearSearch, // Manejador para limpiar búsqueda
    searchTerm, // Término de búsqueda actual
    selectedCats, // Categorías seleccionadas
    selectedStates, // Estados seleccionados
    statusOptions, // Opciones de estado disponibles
  } = props;

  return (
    // Contenedor principal con diseño flexible que se adapta a diferentes tamaños de pantalla
    <div className="flex flex-wrap gap-4 mb-4 items-center">
      {/* Etiqueta "Filtrar por:" con ícono */}
      <div className="flex items-center gap-2 order-2 2xl:order-none">
        <FilterIcon size={16} /> {/* Ícono de filtro */}
        <span className="text-sm font-medium">Filtrar por:</span>
      </div>

      {/* Filtro de Categorías - Select con selección múltiple */}
      <Select
        className="order-2 2xl:order-none" // Orden de aparición según tamaño de pantalla
        classNames={{
          label: "text-default-foreground", // Color del texto de la etiqueta
          base: "w-full lg:max-w-xs", // Ancho completo en móvil, máximo pequeño en pantallas grandes
          value: "text-default-foreground", // Color del valor seleccionado
        }}
        isDisabled={isLoadingCategories} // Desactiva el select mientras carga
        label={
          // Etiqueta que cambia si está cargando
          isLoadingCategories ? (
            <div className="flex items-center gap-2">
              <span>Cargando</span>
              <Spinner size="sm" variant="dots" /> {/* Spinner animado */}
            </div>
          ) : (
            "Categorías"
          )
        }
        renderValue={(items) => {
          // Función que personaliza cómo se muestra el valor seleccionado
          const count = items.length; // Cuenta cuántos items están seleccionados

          // Muestra "X seleccionada(s)" en lugar de mostrar todos los nombres
          return `${count} ${count === 1 ? "seleccionada" : "seleccionadas"}`;
        }}
        selectedKeys={selectedCats} // Categorías actualmente seleccionadas
        selectionMode="multiple" // Permite seleccionar múltiples opciones
        size="sm" // Tamaño pequeño
        onSelectionChange={onCategoriesChange} // Ejecuta función al cambiar selección
      >
        {/* Mapea cada categoría a un SelectItem */}
        {categories.map((cat) => (
          <SelectItem key={cat}>{cat}</SelectItem>
        ))}
      </Select>

      {/* Filtro de Estados - Select con selección múltiple */}
      <Select
        className="order-2 2xl:order-none" // Orden de aparición según tamaño de pantalla
        classNames={{
          label: "text-default-foreground", // Color del texto de la etiqueta
          base: "w-full lg:max-w-xs", // Ancho completo en móvil, máximo pequeño en pantallas grandes
          value: "text-default-foreground", // Color del valor seleccionado
        }}
        label="Estados" // Etiqueta fija
        renderValue={(items) => {
          // Función que personaliza cómo se muestra el valor seleccionado
          const count = items.length; // Cuenta cuántos estados están seleccionados

          // Muestra "X seleccionado(s)" en lugar de mostrar todos los nombres
          return `${count} ${count === 1 ? "seleccionado" : "seleccionados"}`;
        }}
        selectedKeys={selectedStates} // Estados actualmente seleccionados
        selectionMode="multiple" // Permite seleccionar múltiples opciones
        size="sm" // Tamaño pequeño
        onSelectionChange={onStatesChange} // Ejecuta función al cambiar selección
      >
        {/* Object.entries convierte el objeto en array de [clave, valor] para poder iterarlo */}
        {Object.entries(statusOptions).map(([value, label]) => (
          <SelectItem key={value}>{label}</SelectItem>
        ))}
      </Select>

      {/* Barra de búsqueda con campo de texto y botón */}
      <div className="order-1 2xl:order-none basis-full 2xl:basis-1/3 ml-0 2xl:ml-auto w-full 2xl:w-auto flex gap-2">
        {/* Campo de entrada de texto para buscar */}
        <Input
          isClearable // Muestra botón X para limpiar el campo
          classNames={{ base: "w-full", inputWrapper: "shadow-none" }} // Estilos personalizados
          placeholder="Buscar por nombre o SKU..." // Texto guía cuando está vacío
          size="md" // Tamaño mediano
          startContent={<Search className="text-default-300" size={18} />} // Ícono de lupa al inicio
          type="search" // Tipo de input para búsqueda
          value={searchTerm} // Valor actual del campo
          variant="bordered" // Variante con borde
          onChange={onSearchChange} // Se ejecuta cada vez que cambia el texto
          onClear={onClearSearch} // Se ejecuta al hacer clic en la X
          onKeyDown={onKeyDown} // Se ejecuta al presionar teclas (ej: Enter para buscar)
        />
        {/* Botón para ejecutar la búsqueda */}
        <Button
          className="shrink-0" // No se encoge cuando el espacio es limitado
          color="primary" // Color azul primario
          size="md" // Tamaño mediano
          onPress={onSearch} // Ejecuta la función de búsqueda al hacer clic
        >
          Buscar
        </Button>
      </div>
    </div>
  );
}
