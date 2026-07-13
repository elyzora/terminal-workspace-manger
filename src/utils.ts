/**
 * @module utils
 *
 * Small helpers shared across modules.
 */

/**
 * Returns `true` when the given value is a non-empty string.
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
