/**
 * ServiceError class for Jack of All Trades services
 * This needs to be in a separate .ts file since classes can't be declared in .d.ts files
 */

export class ServiceError extends Error {
  constructor(
    message: string,
    public code: string = 'UNKNOWN_ERROR',
    public details?: Record<string, unknown>,
  ) {
    super(message)
    this.name = 'ServiceError'
  }
}
