import type { components, paths } from "@microclimate/contracts";
import createClient from "openapi-fetch";

export type Measurement = components["schemas"]["Measurement"];

export function createApiClient(baseUrl = "") {
  return createClient<paths>({ baseUrl });
}

export type ApiClient = ReturnType<typeof createApiClient>;

export class ApiError extends Error {
  readonly status: number;
  readonly detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

export function toApiError(response: Response, payload: unknown): ApiError {
  const detail =
    payload !== null &&
    typeof payload === "object" &&
    "detail" in payload &&
    typeof payload.detail === "string"
      ? payload.detail
      : `Request failed with status ${response.status}`;
  return new ApiError(response.status, detail);
}
