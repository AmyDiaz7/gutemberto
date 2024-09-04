import type { FormState } from "../types";

import { SetStateAction } from "react";
import { Button } from "@nextui-org/react";
import { useSearchParams } from "next/navigation";

import { login } from "@/lib/actions/loginActions";

interface Props {
  handleValidate: () => void;
  blurredInputs: string[];
  setBlurredInputs: React.Dispatch<SetStateAction<string[]>>;
  formState: FormState;
  setFormState: React.Dispatch<SetStateAction<FormState>>;
  setInvalidCredentials: React.Dispatch<SetStateAction<boolean>>;
}

export default function LoginButton({
  handleValidate,
  blurredInputs,
  setBlurredInputs,
  formState,
  setFormState,
  setInvalidCredentials,
}: Props): React.FunctionComponentElement<Props> {
  const searchParams = useSearchParams();

  async function validateLogin(formData: FormData) {
    if (blurredInputs.length !== 2) setBlurredInputs(["email", "password"]);

    handleValidate();

    if (formState.valid) {
      const result = await login(formData, searchParams.get("next"));

      if (result === "Credenciales incorrectas") {
        setFormState({
          valid: false,
          errors: {
            email: ["Verifica tu correo electronico"],
            password: ["Verifica tu contraseña"],
          },
        });
        setInvalidCredentials(true);
      }
    }
  }

  return (
    <Button
      className="mb-2"
      color="primary"
      formAction={validateLogin}
      type="submit"
    >
      Ingresar
    </Button>
  );
}
