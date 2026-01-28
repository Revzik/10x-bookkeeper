import { useState } from "react";
import { apiClient } from "@/lib/api/client";
import type {
  CreateNoteCommand,
  CreateNoteResponseDto,
  UpdateNoteCommand,
  UpdateNoteResponseDto,
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
 * Custom hook for managing note mutations (create, update, delete)
 * with built-in loading states and error handling.
 *
 * Features:
 * - Centralized API call logic
 * - Loading state management per operation
 * - Standardized error mapping (field-level and general errors)
 * - Type-safe API responses
 * - Handles NOT_FOUND as success for delete operations
 */
export function useNoteMutations() {
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

    // Handle rate limiting errors
    if (apiError.error?.code === "RATE_LIMITED") {
      return { generalError: "Too many requests. Please wait a moment and try again." };
    }

    // Handle general errors
    return { generalError: apiError.error?.message || "An unexpected error occurred" };
  };

  /**
   * Creates a new note for a chapter
   */
  const createNote = async (
    chapterId: string,
    command: CreateNoteCommand
  ): Promise<MutationResult<CreateNoteResponseDto>> => {
    setIsCreating(true);
    try {
      const data = await apiClient.postJson<CreateNoteCommand, CreateNoteResponseDto>(
        `/chapters/${chapterId}/notes`,
        command
      );
      return { success: true, data };
    } catch (error) {
      return { success: false, error: mapApiError(error) };
    } finally {
      setIsCreating(false);
    }
  };

  /**
   * Updates an existing note
   */
  const updateNote = async (
    noteId: string,
    command: UpdateNoteCommand
  ): Promise<MutationResult<UpdateNoteResponseDto>> => {
    setIsUpdating(true);
    try {
      const data = await apiClient.patchJson<UpdateNoteCommand, UpdateNoteResponseDto>(`/notes/${noteId}`, command);
      return { success: true, data };
    } catch (error) {
      const apiError = error as ApiErrorResponseDto;

      // Handle NOT_FOUND (note was deleted) - treat as success
      if (apiError.error?.code === "NOT_FOUND") {
        return { success: true };
      }

      return { success: false, error: mapApiError(error) };
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * Deletes a note
   */
  const deleteNote = async (noteId: string): Promise<MutationResult<void>> => {
    setIsDeleting(true);
    try {
      await apiClient.delete(`/notes/${noteId}`);
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
    createNote,
    updateNote,
    deleteNote,
    isCreating,
    isUpdating,
    isDeleting,
  };
}
