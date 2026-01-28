import { useState } from "react";
import { apiClient } from "@/lib/api/client";
import type {
  CreateChapterCommand,
  CreateChapterResponseDto,
  UpdateChapterCommand,
  UpdateChapterResponseDto,
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
 * Custom hook for managing chapter mutations (create, update, delete)
 * with built-in loading states and error handling.
 *
 * Features:
 * - Centralized API call logic
 * - Loading state management per operation
 * - Standardized error mapping (field-level and general errors)
 * - Type-safe API responses
 * - Handles NOT_FOUND as success for delete operations
 */
export function useChapterMutations() {
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
      return { generalError: apiError.error.message || "Resource not found" };
    }

    // Handle general errors
    return { generalError: apiError.error?.message || "An unexpected error occurred" };
  };

  /**
   * Creates a new chapter for a book
   */
  const createChapter = async (
    bookId: string,
    command: CreateChapterCommand
  ): Promise<MutationResult<CreateChapterResponseDto>> => {
    setIsCreating(true);
    try {
      const data = await apiClient.postJson<CreateChapterCommand, CreateChapterResponseDto>(
        `/books/${bookId}/chapters`,
        command
      );
      return { success: true, data };
    } catch (error) {
      const apiError = error as ApiErrorResponseDto;

      // Handle NOT_FOUND (book was deleted)
      if (apiError.error?.code === "NOT_FOUND") {
        return {
          success: false,
          error: { generalError: "This book no longer exists" },
        };
      }

      return { success: false, error: mapApiError(error) };
    } finally {
      setIsCreating(false);
    }
  };

  /**
   * Updates an existing chapter
   */
  const updateChapter = async (
    chapterId: string,
    command: UpdateChapterCommand
  ): Promise<MutationResult<UpdateChapterResponseDto>> => {
    setIsUpdating(true);
    try {
      const data = await apiClient.patchJson<UpdateChapterCommand, UpdateChapterResponseDto>(
        `/chapters/${chapterId}`,
        command
      );
      return { success: true, data };
    } catch (error) {
      const apiError = error as ApiErrorResponseDto;

      // Handle NOT_FOUND (chapter was deleted)
      if (apiError.error?.code === "NOT_FOUND") {
        return {
          success: false,
          error: { generalError: "This chapter no longer exists" },
        };
      }

      return { success: false, error: mapApiError(error) };
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * Deletes a chapter
   */
  const deleteChapter = async (chapterId: string): Promise<MutationResult<void>> => {
    setIsDeleting(true);
    try {
      await apiClient.delete(`/chapters/${chapterId}`);
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
    createChapter,
    updateChapter,
    deleteChapter,
    isCreating,
    isUpdating,
    isDeleting,
  };
}
