// Indicamos que este componente se ejecuta en el navegador (lado del cliente)
"use client";

// Importamos componentes de Modal de la librería HeroUI
// Modal: contenedor principal del diálogo
// ModalBody: cuerpo del modal donde va el contenido
// ModalContent: wrapper del contenido
// ModalFooter: pie del modal donde van los botones
// ModalHeader: encabezado del modal con el título
import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/react";

// Definimos el tipo de las propiedades (props) que recibe este componente
type Props = {
  isOpen: boolean; // Controla si el diálogo está visible o no
  title?: string; // Título del diálogo (opcional, por defecto "Confirmar")
  description?: string; // Descripción o mensaje del diálogo (opcional)
  confirmText?: string; // Texto del botón de confirmar (opcional, por defecto "Confirmar")
  cancelText?: string; // Texto del botón de cancelar (opcional, por defecto "Cancelar")
  isLoading?: boolean; // Indica si está procesando (muestra loading, opcional)
  variant?: "danger" | "primary"; // Estilo del botón: peligroso (rojo) o primario (azul)
  onCancel?: () => void; // Función que se ejecuta al cancelar
  onConfirm?: () => void | Promise<void>; // Función que se ejecuta al confirmar (puede ser asíncrona)
  onOpenChange?: (open: boolean) => void; // Función que se ejecuta cuando cambia el estado abierto/cerrado
};

/**
 * Componente de diálogo de confirmación reutilizable
 * Se usa para pedir confirmación al usuario antes de realizar acciones importantes
 * como eliminar, actualizar o cambiar datos
 */
export default function ConfirmDialog({
  isOpen,
  title = "Confirmar", // Valor por defecto si no se proporciona
  description,
  confirmText = "Confirmar", // Valor por defecto si no se proporciona
  cancelText = "Cancelar", // Valor por defecto si no se proporciona
  isLoading = false, // Por defecto no está cargando
  variant = "primary", // Por defecto usa el estilo primario (azul)
  onCancel,
  onConfirm,
  onOpenChange,
}: Props) {
  return (
    <Modal
      classNames={{
        wrapper: "items-center", // Centra verticalmente el modal
        base: "w-full sm:max-w-md", // Ancho completo en móvil, máximo mediano en pantallas grandes
      }}
      isOpen={isOpen} // Controla si el modal está visible
      placement="center" // Coloca el modal en el centro de la pantalla
      scrollBehavior="inside" // El scroll se aplica dentro del modal
      size="sm" // Tamaño pequeño del modal
      onOpenChange={(open) => onOpenChange?.(open)} // Notifica cambios en el estado del modal
    >
      <ModalContent>
        {/* Encabezado del modal con el título */}
        <ModalHeader>{title}</ModalHeader>

        {/* Si hay descripción, la mostramos. Si no, no renderizamos nada (null) */}
        {description ? <ModalBody>{description}</ModalBody> : null}

        {/* Pie del modal con los botones de acción */}
        <ModalFooter>
          {/* Botón de cancelar: deshabilitado cuando está cargando */}
          <Button isDisabled={isLoading} variant="flat" onPress={onCancel}>
            {cancelText}
          </Button>

          {/* Botón de confirmar: cambia de color según la variante y muestra loading */}
          <Button
            color={variant === "danger" ? "danger" : "primary"} // Rojo si es peligroso, azul si es primario
            isLoading={isLoading} // Muestra animación de carga mientras procesa
            onPress={onConfirm} // Ejecuta la función de confirmar
          >
            {confirmText}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
