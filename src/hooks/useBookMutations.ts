import { useState } from "react";
import { apiClient } from "@/lib/api/client";
import type {
  CreateBookCommand,
  CreateBookResponseDto,
  UpdateBookCommand,
  UpdateBookResponseDto,
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
 * Custom hook for managing book mutations (create, update, delete)
 * with built-in loading states and error handling.
 *
 * Features:
 * - Centralized API call logic
 * - Loading state management per operation
 * - Standardized error mapping (field-level and general errors)
 * - Type-safe API responses
 */
export function useBookMutations() {
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
   * Creates a new book
   */
  const createBook = async (command: CreateBookCommand): Promise<MutationResult<CreateBookResponseDto>> => {
    setIsCreating(true);
    try {
      const data = await apiClient.postJson<CreateBookCommand, CreateBookResponseDto>("/books", command);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: mapApiError(error) };
    } finally {
      setIsCreating(false);
    }
  };

  /**
   * Updates an existing book
   */
  const updateBook = async (
    bookId: string,
    command: UpdateBookCommand
  ): Promise<MutationResult<UpdateBookResponseDto>> => {
    setIsUpdating(true);
    try {
      const data = await apiClient.patchJson<UpdateBookCommand, UpdateBookResponseDto>(`/books/${bookId}`, command);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: mapApiError(error) };
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * Deletes a book
   */
  const deleteBook = async (bookId: string): Promise<MutationResult<void>> => {
    setIsDeleting(true);
    try {
      await apiClient.delete(`/books/${bookId}`);
      return { success: true };
    } catch (error) {
      return { success: false, error: mapApiError(error) };
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    createBook,
    updateBook,
    deleteBook,
    isCreating,
    isUpdating,
    isDeleting,
  };
}
