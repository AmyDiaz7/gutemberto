"use client";
import { useState, useEffect } from "react";
import { Input, Button } from "@nextui-org/react";
import { z } from "zod";

import { login, signup } from "./actions";

const FormSchema = z.object({
  email: z
    .string({
      invalid_type_error: "Ingresa tu correo",
    })
    .min(1, { message: "Ingresa tu correo" })
    .email({ message: "Ingresa un correo valido" }),
  password: z
    .string({ invalid_type_error: "Ingresa tu contraseña" })
    .min(1, { message: "Ingresa tu contraseña" }),
});

interface FormState {
  valid: boolean;
  errors?: { [field: string]: string[] };
}

interface FormValues {
  email: string | null;
  password: string | null;
}

export default function LoginPage() {
  const [formState, setFormState] = useState<FormState>({
    valid: false,
  });

  const [formValues, setFormValues] = useState<FormValues>({
    email: null,
    password: null,
  });

  const [blurredInputs, setBlurredInputs] = useState<string[]>([]);

  const [invalidCredentials, setInvalidCredentials] = useState(false);

  const handleInputChange = ({
    target: { name, value },
  }: {
    target: { name: string; value: string };
  }) => {
    setFormValues((prevValues) => ({
      ...prevValues,
      [name]: value,
    }));

    if (invalidCredentials) setInvalidCredentials(false);
  };

  const validateForm = () => {
    const validation = FormSchema.safeParse(formValues);

    if (!validation.success) {
      setFormState({
        valid: false,
        errors: validation.error.formErrors.fieldErrors,
      });
    } else {
      setFormState({ valid: true });
    }
  };

  const handleBlur = (field: keyof FormValues) => {
    if (formValues[field] === null) return;

    if (!blurredInputs.includes(field))
      setBlurredInputs([...blurredInputs, field]);
    validateForm();
  };

  useEffect(() => {
    if (blurredInputs.length > 0) validateForm();
  }, [formValues]);

  function validateLogin(formData: FormData) {
    if (blurredInputs.length !== 2) setBlurredInputs(["email", "password"]);

    validateForm();

    if (formState.valid) {
      login(formData);

      /*if (result === "Credenciales incorrectas") {
        setFormState({
          valid: false,
          errors: {
            email: ["Verifica tu correo electronico"],
            password: ["Verifica tu contraseña"],
          },
        });
        setInvalidCredentials(true);
      } else alert("hola");*/
    }
  }

  return (
    <div className="bg-background container my-auto mx-auto max-w-sm py-16 px-10 rounded-lg drop-shadow">
      <h1 className="font-title text-center text-3xl font-bold mb-8">
        Gutemberto
      </h1>
      <form className="flex flex-col">
        <Input
          isClearable
          isRequired
          classNames={{
            base: "mb-6",
            label: "font-medium text-md",
          }}
          errorMessage={
            blurredInputs.includes("email")
              ? formState.errors?.email?.[0]
              : undefined
          }
          isInvalid={
            !!formState.errors?.email && blurredInputs.includes("email")
          }
          label="Correo"
          labelPlacement="outside"
          name="email"
          placeholder="Ingresa tu correo"
          type="email"
          onBlur={() => handleBlur("email")}
          onChange={handleInputChange}
        />
        <Input
          isRequired
          classNames={{
            base: invalidCredentials ? "mb-2" : "mb-8",
            label: "font-medium text-md",
          }}
          errorMessage={
            blurredInputs.includes("password")
              ? formState.errors?.password?.[0]
              : undefined
          }
          isInvalid={
            !!formState.errors?.password && blurredInputs.includes("password")
          }
          label="Contraseña"
          labelPlacement="outside"
          name="password"
          placeholder="Ingresa tu contraseña"
          type="password"
          onBlur={() => handleBlur("password")}
          onChange={handleInputChange}
        />

        {invalidCredentials && (
          <p className="text-danger text-tiny text-center mb-3">
            El correo y la contraseña no coinciden, por favor verificalos
          </p>
        )}
        <Button
          className="mb-2"
          color="primary"
          formAction={login}
          type="submit"
        >
          Ingresar
        </Button>
        <Button
          color="primary"
          formAction={signup}
          type="submit"
          variant="light"
        >
          Registro
        </Button>
      </form>
    </div>
  );
}
