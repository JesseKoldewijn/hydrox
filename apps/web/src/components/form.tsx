/** @jsxImportSource octane */

export function labelize(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function trimOrEmpty(value: string): string {
  return value.trim();
}

/** Returns a human error if empty; otherwise null. */
export function requiredMessage(value: string, label = "This field"): string | null {
  return value.trim() ? null : `${label} is required`;
}

export function FormError(props: { message?: string | null; testId?: string }) {
  if (!props.message) return null;
  return (
    <p class="form-error" role="alert" data-testid={props.testId ?? "form-error"}>
      {props.message}
    </p>
  );
}

export function FieldError(props: { message?: string | null; testId?: string }) {
  if (!props.message) return null;
  return (
    <span class="field-error" role="alert" data-testid={props.testId}>
      {props.message}
    </span>
  );
}

export function FormHint(props: { children?: any; testId?: string }) {
  return (
    <p class="form-hint" data-testid={props.testId}>
      {props.children}
    </p>
  );
}

export function FormSuccess(props: { message?: string | null; testId?: string }) {
  if (!props.message) return null;
  return (
    <p class="form-success" data-testid={props.testId ?? "form-success"}>
      {props.message}
    </p>
  );
}
