import { useState } from "react";
import { apiClient } from "@/lib/api/client";
import type {
  CreateSeriesCommand,
  CreateSeriesResponseDto,
  UpdateSeriesCommand,
  UpdateSeriesResponseDto,
  ApiErrorResponseDto,
} from "@/types";

interface MutationError {
  fieldErrors?: Record<string, string>;
  generalError?: string;
}

interface MutationResult<T> {
  success: boolean;
  data?: T;
  error?: MutationError;
}

/**
 * Custom hook for managing series mutations (create, update, delete)
 * with built-in loading states and error handling.
 *
 * Features:
 * - Centralized API call logic
 * - Loading state management per operation
 * - Standardized error mapping (field-level and general errors)
 * - Type-safe API responses
 * - Special handling for NOT_FOUND in delete operations (treats as success)
 */
export function useSeriesMutations() {
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  /**
   * Maps API errors to form-friendly error structure
   */
  const mapApiError = (error: unknown): MutationError => {
    const apiError = error as ApiErrorResponseDto;

    // Handle validation errors (map to field-level errors)
    if (apiError.error?.code === "VALIDATION_ERROR" && apiError.error.details) {
      const fieldErrors: Record<string, string> = {};
      apiError.error.details.forEach((issue) => {
        const fieldName = issue.path.join(".");
        fieldErrors[fieldName] = issue.message;
      });
      return { fieldErrors };
    }

    // Handle NOT_FOUND errors
    if (apiError.error?.code === "NOT_FOUND") {
      return { generalError: apiError.error.message || "Series not found" };
    }

    // Handle general errors
    return { generalError: apiError.error?.message || "An unexpected error occurred" };
  };

  /**
   * Creates a new series
   */
  const createSeries = async (command: CreateSeriesCommand): Promise<MutationResult<CreateSeriesResponseDto>> => {
    setIsCreating(true);
    try {
      const data = await apiClient.postJson<CreateSeriesCommand, CreateSeriesResponseDto>("/series", command);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: mapApiError(error) };
    } finally {
      setIsCreating(false);
    }
  };

  /**
   * Updates an existing series
   */
  const updateSeries = async (
    seriesId: string,
    command: UpdateSeriesCommand
  ): Promise<MutationResult<UpdateSeriesResponseDto>> => {
    setIsUpdating(true);
    try {
      const data = await apiClient.patchJson<UpdateSeriesCommand, UpdateSeriesResponseDto>(
        `/series/${seriesId}`,
        command
      );
      return { success: true, data };
    } catch (error) {
      return { success: false, error: mapApiError(error) };
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * Deletes a series
   * @param seriesId - The ID of the series to delete
   * @param cascade - If true, also deletes all books, chapters, and notes in the series
   */
  const deleteSeries = async (seriesId: string, cascade = false): Promise<MutationResult<void>> => {
    setIsDeleting(true);
    try {
      const endpoint = cascade ? `/series/${seriesId}?cascade=true` : `/series/${seriesId}`;
      await apiClient.delete(endpoint);
      return { success: true };
    } catch (error) {
      const apiError = error as ApiErrorResponseDto;

      // Handle NOT_FOUND (already deleted) - treat as success
      if (apiError.error?.code === "NOT_FOUND") {
        return { success: true };
      }

      return { success: false, error: mapApiError(error) };
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    createSeries,
    updateSeries,
    deleteSeries,
    isCreating,
    isUpdating,
    isDeleting,
  };
}
