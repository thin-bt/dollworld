export class InitialWorldGenerationError extends Error {
  readonly context: Record<string, string | number | boolean>;

  constructor(message: string, context: Record<string, string | number | boolean> = {}) {
    const detail = Object.entries(context)
      .map(([key, value]) => `${key}=${String(value)}`)
      .join(", ");
    super(detail.length > 0 ? `${message} (${detail})` : message);
    this.name = "InitialWorldGenerationError";
    this.context = context;
  }
}
