/** Re-entered admin name+password used to confirm deleting an assigned book or lot. */
export type AdminCredentials = { name: string; password: string }

/** Status a delete route returns when admin credentials are missing or wrong. */
export const ADMIN_CONFIRM_REQUIRED_STATUS = 428

/**
 * Thrown when a fetch to `/api/*` returns a non-OK status.
 * Message is taken from `{ error: string }` when the body includes it.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message)
    this.name = "ApiError"
  }
}

/** Server responses are wrapped as `{ success: true, data } | { success: false, error }`. */
export async function parseResponse<T>(response: Response): Promise<T> {
  if (response.ok) {
    const body = (await response.json()) as { data: T }
    return body.data
  }
  let message = `Request failed (${response.status})`
  try {
    const body: unknown = await response.json()
    if (
      body &&
      typeof body === "object" &&
      "error" in body &&
      typeof (body as { error: unknown }).error === "string"
    ) {
      message = (body as { error: string }).error
    }
  } catch {
    /* non-JSON body */
  }
  throw new ApiError(message, response.status)
}
