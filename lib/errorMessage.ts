/** Readable message for a caught error */
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
