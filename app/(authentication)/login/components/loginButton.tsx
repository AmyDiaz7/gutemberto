// Importamos el tipo FormState que define la estructura del estado del formulario
import type { FormState } from "../types";

// Importamos SetStateAction de React para tipar las funciones que actualizan estados
import { SetStateAction } from "react";
// Importamos el componente Button de la librería de UI HeroUI
import { Button } from "@heroui/react";
// useSearchParams nos permite leer parámetros de la URL (como ?next=/dashboard)
import { useSearchParams } from "next/navigation";

// Importamos la función login que maneja la autenticación del usuario
import { login } from "@/lib/actions/loginActions";

/**
 * Props (propiedades) que recibe el componente LoginButton
 * Estas son funciones y valores que el componente padre le pasa a este componente
 */
interface Props {
  // Función para validar los campos del formulario
  handleValidate: () => void;
  // Array con los nombres de los campos que el usuario ya tocó/salió (blur)
  blurredInputs: string[];
  // Función para actualizar qué campos se han tocado
  setBlurredInputs: React.Dispatch<SetStateAction<string[]>>;
  // Estado actual del formulario (si es válido y qué errores tiene)
  formState: FormState;
  // Función para actualizar el estado del formulario
  setFormState: React.Dispatch<SetStateAction<FormState>>;
  // Función para indicar si las credenciales ingresadas son incorrectas
  setInvalidCredentials: React.Dispatch<SetStateAction<boolean>>;
}

/**
 * Componente LoginButton
 * Este es el botón que aparece en el formulario de inicio de sesión.
 * Maneja la validación y el envío de las credenciales del usuario.
 */
export default function LoginButton({
  handleValidate,
  blurredInputs,
  setBlurredInputs,
  formState,
  setFormState,
  setInvalidCredentials,
}: Props): React.FunctionComponentElement<Props> {
  // Obtenemos los parámetros de la URL (ejemplo: si viene de /login?next=/dashboard)
  const searchParams = useSearchParams();

  /**
   * Función que se ejecuta cuando el usuario hace clic en "Ingresar"
   * 1. Valida que todos los campos estén completos
   * 2. Si son válidos, intenta hacer login
   * 3. Si las credenciales son incorrectas, muestra errores
   */
  async function validateLogin(formData: FormData) {
    // Si el usuario no ha tocado ambos campos, los marcamos como tocados
    // Esto hace que se muestren los mensajes de error si están vacíos
    if (blurredInputs.length !== 2) setBlurredInputs(["email", "password"]);

    // Ejecutamos la validación de los campos (verifica si están llenos y correctos)
    handleValidate();

    // Solo intentamos hacer login si el formulario es válido
    if (formState.valid) {
      // Llamamos a la función login con los datos del formulario
      // searchParams.get("next") obtiene la página a la que redirigir después del login
      const result = await login(formData, searchParams.get("next"));

      // Si el login falla, mostramos mensajes de error al usuario
      if (result === "Credenciales incorrectas") {
        setFormState({
          valid: false, // Marcamos el formulario como inválido
          errors: {
            email: ["Verifica tu correo electronico"],
            password: ["Verifica tu contraseña"],
          },
        });
        // Activamos la bandera de credenciales inválidas
        setInvalidCredentials(true);
      }
    }
  }

  return (
    <Button
      className="mb-2" // Margen inferior de 2 unidades
      color="primary" // Color primario del tema (generalmente azul)
      formAction={validateLogin} // Función que se ejecuta al hacer clic
      type="submit" // Tipo submit para que funcione con el formulario
      onPointerDown={() => {
        // Cuando el usuario presiona el botón (antes de soltarlo),
        // marcamos ambos campos como "tocados" para mostrar errores si existen
        if (blurredInputs.length !== 2) setBlurredInputs(["email", "password"]);
      }}
    >
      Ingresar
    </Button>
  );
}
