// Esta directiva indica que este componente se ejecuta en el navegador del cliente
"use client";

// Importamos todos los componentes necesarios para crear un modal (ventana emergente)
import {
  Button, // Botón para las acciones (Confirmar/Cancelar)
  Modal, // Contenedor principal del modal
  ModalBody, // Cuerpo del modal donde va el contenido principal
  ModalContent, // Envoltorio del contenido del modal
  ModalFooter, // Pie del modal donde van los botones
  ModalHeader, // Encabezado del modal donde va el título
} from "@heroui/react";

// Definimos el tipo de propiedades que este componente puede recibir
type Props = {
  isOpen: boolean; // Determina si el modal está visible (true) o oculto (false)
  title?: string; // Título que se muestra arriba del modal (opcional con ?)
  description?: string; // Texto descriptivo que explica la acción (opcional)
  confirmText?: string; // Texto del botón de confirmar (opcional, por defecto "Confirmar")
  cancelText?: string; // Texto del botón de cancelar (opcional, por defecto "Cancelar")
  isLoading?: boolean; // Indica si está cargando (muestra spinner en el botón)
  variant?: "danger" | "primary"; // Estilo del botón: "danger" (rojo) o "primary" (azul)
  onCancel?: () => void; // Función que se ejecuta al cancelar (opcional)
  onConfirm?: () => void | Promise<void>; // Función que se ejecuta al confirmar (puede ser asíncrona)
  onOpenChange?: (open: boolean) => void; // Función que se ejecuta cuando el modal se abre o cierra
};

// Componente principal que muestra un diálogo de confirmación
export default function ConfirmDialog({
  isOpen, // Si el modal debe mostrarse o no
  title = "Confirmar", // Título por defecto si no se proporciona uno
  description, // Descripción opcional del diálogo
  confirmText = "Confirmar", // Texto por defecto del botón de confirmar
  cancelText = "Cancelar", // Texto por defecto del botón de cancelar
  isLoading = false, // Por defecto no está en estado de carga
  variant = "primary", // Por defecto usa el estilo azul primario
  onCancel, // Función a ejecutar al cancelar
  onConfirm, // Función a ejecutar al confirmar
  onOpenChange, // Función a ejecutar cuando cambia el estado abierto/cerrado
}: Props) {
  return (
    // Componente Modal principal que crea la ventana emergente
    <Modal
      classNames={{
        wrapper: "items-center", // Centra verticalmente el modal en la pantalla
        base: "w-full sm:max-w-md", // Ancho completo en móvil, máximo mediano en pantallas grandes
      }}
      isOpen={isOpen} // Controla si el modal está visible
      placement="center" // Posiciona el modal en el centro de la pantalla
      scrollBehavior="inside" // Si el contenido es largo, el scroll está dentro del modal
      size="sm" // Tamaño pequeño del modal
      onOpenChange={(open) => onOpenChange?.(open)} // Llama a la función onOpenChange si existe (el ? previene error si es undefined)
    >
      {/* ModalContent envuelve todo el contenido interno del modal */}
      <ModalContent>
        {/* ModalHeader muestra el título en la parte superior */}
        <ModalHeader>{title}</ModalHeader>

        {/* ModalBody muestra la descripción solo si existe una descripción */}
        {/* Si description es undefined o vacío, no se muestra nada (null) */}
        {description ? <ModalBody>{description}</ModalBody> : null}

        {/* ModalFooter contiene los botones de acción en la parte inferior */}
        <ModalFooter>
          {/* Botón de Cancelar */}
          <Button
            isDisabled={isLoading} // Desactiva el botón si está cargando
            variant="flat" // Estilo plano (sin relleno sólido)
            onPress={onCancel} // Ejecuta la función onCancel al hacer clic
          >
            {cancelText} {/* Muestra el texto del botón de cancelar */}
          </Button>

          {/* Botón de Confirmar */}
          <Button
            color={variant === "danger" ? "danger" : "primary"} // Rojo si es "danger", azul si es "primary"
            isLoading={isLoading} // Muestra un spinner si está cargando
            onPress={onConfirm} // Ejecuta la función onConfirm al hacer clic
          >
            {confirmText} {/* Muestra el texto del botón de confirmar */}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
