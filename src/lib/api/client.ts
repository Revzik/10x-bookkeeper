import type { ApiErrorResponseDto } from "@/types";

/**
 * Typed fetch helper for API calls
 */
export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl = "/api/v1") {
    this.baseUrl = baseUrl;
  }

  /**
   * Perform a GET request with typed response
   */
  async getJson<TResponse>(
    endpoint: string,
    params?: Record<string, string | number | boolean | undefined | null>
  ): Promise<TResponse> {
    const url = this.buildUrl(endpoint, params);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    return this.handleResponse<TResponse>(response);
  }

  /**
   * Perform a POST request with typed request and response
   */
  async postJson<TRequest, TResponse>(endpoint: string, body: TRequest): Promise<TResponse> {
    const url = this.buildUrl(endpoint);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    return this.handleResponse<TResponse>(response);
  }

  /**
   * Perform a PATCH request with typed request and response
   */
  async patchJson<TRequest, TResponse>(endpoint: string, body: TRequest): Promise<TResponse> {
    const url = this.buildUrl(endpoint);

    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    return this.handleResponse<TResponse>(response);
  }

  /**
   * Perform a DELETE request
   */
  async delete(endpoint: string): Promise<void> {
    const url = this.buildUrl(endpoint);

    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      await this.handleError(response);
    }
  }

  /**
   * Build URL with query params
   */
  private buildUrl(endpoint: string, params?: Record<string, string | number | boolean | undefined | null>): string {
    const url = new URL(`${this.baseUrl}${endpoint}`, window.location.origin);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          url.searchParams.append(key, String(value));
        }
      });
    }

    return url.toString();
  }

  /**
   * Handle response and parse JSON or throw error
   */
  private async handleResponse<TResponse>(response: Response): Promise<TResponse> {
    if (!response.ok) {
      await this.handleError(response);
    }

    const data = await response.json();
    return data as TResponse;
  }

  /**
   * Handle error response and throw structured error
   */
  private async handleError(response: Response): Promise<never> {
    let errorData: ApiErrorResponseDto;

    try {
      errorData = await response.json();
    } catch {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    throw errorData;
  }
}

/**
 * Default API client instance
 */
export const apiClient = new ApiClient();
