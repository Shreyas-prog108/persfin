export class FinanceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FinanceError";
  }
}

export function assertFinite(name: string, value: number): void {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new FinanceError(`${name} must be a finite number.`);
  }
}

export function assertNonNegative(name: string, value: number): void {
  assertFinite(name, value);
  if (value < 0) {
    throw new FinanceError(`${name} cannot be negative.`);
  }
}

export function assertPositive(name: string, value: number): void {
  assertFinite(name, value);
  if (value <= 0) {
    throw new FinanceError(`${name} must be greater than zero.`);
  }
}

export function assertInteger(
  name: string,
  value: number,
  min?: number,
  max?: number,
): void {
  assertFinite(name, value);
  if (!Number.isInteger(value)) {
    throw new FinanceError(`${name} must be a whole number.`);
  }
  if (min !== undefined && value < min) {
    throw new FinanceError(`${name} must be at least ${min}.`);
  }
  if (max !== undefined && value > max) {
    throw new FinanceError(`${name} must be at most ${max}.`);
  }
}

export function assertRateAboveMinusOne(name: string, rate: number): void {
  assertFinite(name, rate);
  if (rate <= -1) {
    throw new FinanceError(`${name} must be greater than -100%.`);
  }
}
