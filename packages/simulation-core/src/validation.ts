export type ValidationIssue = {
  path: string;
  message: string;
  actual?: unknown;
  expected?: string;
};

export type ValidationSuccess<T> = {
  ok: true;
  value: T;
};

export type ValidationFailure = {
  ok: false;
  issues: ValidationIssue[];
};

export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

export function success<T>(value: T): ValidationSuccess<T> {
  return { ok: true, value };
}

export function failure(issues: ValidationIssue[]): ValidationFailure {
  return { ok: false, issues };
}

export function isSuccess<T>(result: ValidationResult<T>): result is ValidationSuccess<T> {
  return result.ok;
}
