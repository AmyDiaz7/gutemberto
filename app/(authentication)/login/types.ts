export interface FormState {
  valid: boolean;
  errors?: { [field: string]: string[] };
}
