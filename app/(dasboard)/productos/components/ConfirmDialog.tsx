"use client";

import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/react";

type Props = {
  isOpen: boolean;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  variant?: "danger" | "primary";
  onCancel?: () => void;
  onConfirm?: () => void | Promise<void>;
  onOpenChange?: (open: boolean) => void;
};

export default function ConfirmDialog({
  isOpen,
  title = "Confirmar",
  description,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  isLoading = false,
  variant = "primary",
  onCancel,
  onConfirm,
  onOpenChange,
}: Props) {
  return (
    <Modal
      classNames={{
        wrapper: "items-center", // ensure vertical centering
        base: "w-full sm:max-w-md", // responsive width
      }}
      isOpen={isOpen}
      placement="center"
      scrollBehavior="inside"
      size="sm"
      onOpenChange={(open) => onOpenChange?.(open)}
    >
      <ModalContent>
        <ModalHeader>{title}</ModalHeader>
        {description ? <ModalBody>{description}</ModalBody> : null}
        <ModalFooter>
          <Button isDisabled={isLoading} variant="flat" onPress={onCancel}>
            {cancelText}
          </Button>
          <Button
            color={variant === "danger" ? "danger" : "primary"}
            isLoading={isLoading}
            onPress={onConfirm}
          >
            {confirmText}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
