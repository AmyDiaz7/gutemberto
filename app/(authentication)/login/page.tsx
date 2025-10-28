// Esta directiva indica que este componente se ejecuta en el cliente (navegador)
// En Next.js, los componentes por defecto son del servidor, pero este necesita interactividad
"use client";

// Importamos el tipo FormState que define la estructura del estado del formulario
import type { FormState } from "./types";

// Hooks de React para manejar estado y efectos secundarios
import { useState, useEffect, Suspense } from "react";
// Componentes de interfaz de usuario de HeroUI
import { Input } from "@heroui/react";
// Zod es una librería para validar datos (como validar que el email sea válido)
import { z } from "zod";

// Importamos el botón de login personalizado
import LoginButton from "./components/loginButton";

/**
 * FormSchema define las reglas de validación para el formulario
 * Usa Zod para asegurar que los datos ingresados sean correctos
 */
const FormSchema = z.object({
  // El email debe tener al menos 1 caracter y ser un formato válido de email
  email: z
    .string()
    .min(1, "Ingresa tu correo")
    .email("Ingresa un correo valido"),
  // La contraseña debe tener al menos 1 caracter
  password: z.string().min(1, "Ingresa tu contraseña"),
});

/**
 * Interface que define los tipos de los valores del formulario
 * Usamos 'null' cuando el campo aún no ha sido tocado/editado por el usuario
 */
interface FormValues {
  email: string | null;
  password: string | null;
}

/**
 * Componente principal de la página de Login
 * Este componente maneja todo el formulario de inicio de sesión
 */
export default function LoginPage() {
  /**
   * Estado que controla si el formulario es válido y qué errores tiene
   * Empieza como 'valid: false' porque el usuario aún no ha llenado nada
   */
  const [formState, setFormState] = useState<FormState>({
    valid: false,
  });

  /**
   * Estado que guarda los valores actuales del formulario (email y contraseña)
   * Empieza con null porque el usuario no ha escrito nada todavía
   */
  const [formValues, setFormValues] = useState<FormValues>({
    email: null,
    password: null,
  });

  /**
   * Array que guarda los nombres de los campos que el usuario ya ha tocado y salido (blur)
   * Esto es útil para solo mostrar errores en campos que el usuario ya intentó llenar
   */
  const [blurredInputs, setBlurredInputs] = useState<string[]>([]);

  /**
   * Estado que indica si las credenciales ingresadas son incorrectas
   * Se activa cuando el servidor responde que el email/contraseña no coinciden
   */
  const [invalidCredentials, setInvalidCredentials] = useState(false);

  /**
   * Función que se ejecuta cada vez que el usuario escribe en un campo del formulario
   * Actualiza el estado con el nuevo valor y quita el mensaje de credenciales inválidas
   */
  const handleInputChange = ({
    target: { name, value },
  }: {
    target: { name: string; value: string };
  }) => {
    // Actualizamos solo el campo que cambió, manteniendo los demás valores
    setFormValues((prevValues) => ({
      ...prevValues, // Copiamos los valores anteriores
      [name]: value, // Actualizamos solo el campo que cambió
    }));

    // Si hay un mensaje de credenciales inválidas, lo quitamos
    // porque el usuario está corrigiendo su entrada
    if (invalidCredentials) setInvalidCredentials(false);
  };

  /**
   * Función que valida todo el formulario usando el FormSchema de Zod
   * Verifica que el email sea válido y que la contraseña no esté vacía
   */
  const validateForm = () => {
    // safeParse intenta validar los datos y devuelve success: true o false
    const validation = FormSchema.safeParse(formValues);

    if (!validation.success) {
      // Si la validación falla, extraemos los errores de cada campo
      const { fieldErrors } = validation.error.flatten();

      // Actualizamos el estado con los errores encontrados
      setFormState({
        valid: false,
        errors: fieldErrors,
      });
    } else {
      // Si todo es válido, marcamos el formulario como válido (sin errores)
      setFormState({ valid: true });
    }
  };

  /**
   * Función que se ejecuta cuando el usuario sale de un campo (evento blur)
   * Marca el campo como "tocado" para poder mostrar errores si los hay
   */
  const handleBlur = (field: keyof FormValues) => {
    // Si el campo está vacío (null), no hacemos nada todavía
    if (formValues[field] === null) return;

    // Si este campo no está en la lista de campos tocados, lo agregamos
    if (!blurredInputs.includes(field))
      setBlurredInputs([...blurredInputs, field]);

    // Validamos el formulario para actualizar los errores
    validateForm();
  };

  /**
   * useEffect que re-valida el formulario cada vez que cambian los valores
   * Solo si ya hay campos marcados como "tocados" (blurredInputs)
   * Esto permite validación en tiempo real mientras el usuario escribe
   */
  useEffect(() => {
    if (blurredInputs.length > 0) validateForm();
  }, [formValues]); // Se ejecuta cada vez que formValues cambia

  return (
    // Contenedor principal: centrado, con fondo y sombra
    <div className="bg-background container my-auto mx-auto max-w-sm py-16 px-10 rounded-lg drop-shadow">
      {/* Título de la aplicación */}
      <h1 className="text-black font-title text-center text-3xl font-bold mb-8">
        Gutemberto
      </h1>

      {/* Formulario de login */}
      <form className="flex flex-col color-black">
        {/* Campo de Email */}
        <Input
          isClearable // Muestra un botón X para limpiar el campo
          isRequired // Campo obligatorio (muestra un asterisco *)
          classNames={{
            base: "mb-6", // Margen inferior de 6 unidades
            label: "font-medium text-md", // Estilo de la etiqueta
            clearButton: "text-black", // Color del botón de limpiar
          }}
          // Mensaje de error: solo se muestra si el usuario ya tocó este campo
          errorMessage={
            blurredInputs.includes("email")
              ? formState.errors?.email?.[0]
              : undefined
          }
          // Marca el campo como inválido si hay errores Y el usuario lo tocó
          isInvalid={
            !!formState.errors?.email && blurredInputs.includes("email")
          }
          label="Correo"
          labelPlacement="outside" // Etiqueta arriba del campo
          name="email"
          placeholder="Ingresa tu correo"
          type="email"
          onBlur={() => handleBlur("email")} // Cuando el usuario sale del campo
          onChange={handleInputChange} // Cuando el usuario escribe
          onClear={() => setFormValues((prev) => ({ ...prev, email: null }))} // Al hacer clic en X
        />

        {/* Campo de Contraseña */}
        <Input
          isRequired
          classNames={{
            // Si hay credenciales inválidas, reducimos el margen para mostrar el mensaje
            base: invalidCredentials ? "mb-2" : "mb-8",
            label: "font-medium text-md",
          }}
          // Mensaje de error: solo se muestra si el usuario ya tocó este campo
          errorMessage={
            blurredInputs.includes("password")
              ? formState.errors?.password?.[0]
              : undefined
          }
          // Marca el campo como inválido si hay errores Y el usuario lo tocó
          isInvalid={
            !!formState.errors?.password && blurredInputs.includes("password")
          }
          label="Contraseña"
          labelPlacement="outside"
          name="password"
          placeholder="Ingresa tu contraseña"
          type="password" // Oculta el texto de la contraseña
          onBlur={() => handleBlur("password")}
          onChange={handleInputChange}
        />

        {/* Mensaje de error cuando las credenciales no coinciden */}
        {invalidCredentials && (
          <p className="text-danger text-tiny text-center mb-3">
            El correo y la contraseña no coinciden, por favor verificalos
          </p>
        )}

        {/* Botón de Login envuelto en Suspense para carga asíncrona */}
        <Suspense>
          <LoginButton
            blurredInputs={blurredInputs}
            formState={formState}
            handleValidate={validateForm}
            setBlurredInputs={setBlurredInputs}
            setFormState={setFormState}
            setInvalidCredentials={setInvalidCredentials}
          />
        </Suspense>
      </form>
    </div>
  );
}
