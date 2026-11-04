import { createApiClient } from "@microclimate/api-client";

/** Relative URLs go through the Vite/nginx proxy. */
export const api = createApiClient();
