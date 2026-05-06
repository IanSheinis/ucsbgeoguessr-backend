/**
 * Extracts a readable message from an unknown catch variable.
 */
export function getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    return String(error);
}
