import { useMemo, useEffect, useState } from "react";
import type { ChapterListItemViewModel, ChapterSelectOptionViewModel } from "@/types";
import { useBookUrlState } from "./hooks/useBookUrlState";
import { useChaptersList } from "./hooks/useChaptersList";
import { useNotesList } from "@/components/book/hooks/useNotesList";
import { BookNotesHeaderRow } from "./BookNotesHeaderRow";
import { BookNotesList } from "./BookNotesList";
import { InlineBanner } from "@/components/library/InlineBanner";
import { PaginationControls } from "@/components/library/PaginationControls";
import { ViewNoteDialog } from "./ViewNoteDialog";
import { useT } from "@/i18n/react";
import { withLocalePath } from "@/i18n";

interface BookNotesTabPanelProps {
  bookId: string;
  chaptersVersion?: number;
}

/**
 * BookNotesTabPanel - Notes management UI for a book
 *
 * Features:
 * - Filter notes by chapter (All chapters or specific chapter)
 * - Paginated notes list grouped by chapter
 * - Create/view/edit/delete notes via dedicated pages
 * - URL-backed state for filters and pagination
 */
export const BookNotesTabPanel = ({ bookId, chaptersVersion }: BookNotesTabPanelProps) => {
  const { t, locale } = useT();
  const { notesQuery, setNotesQuery } = useBookUrlState();
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  // Fetch chapters for filter dropdown and chapter title lookup
  const {
    items: chapters,
    loading: chaptersLoading,
    error: chaptersError,
    refetch: refetchChapters,
  } = useChaptersList(bookId);

  // Fetch notes with current query
  const {
    items: notes,
    meta,
    loading: notesLoading,
    error: notesError,
    refetch: refetchNotes,
  } = useNotesList({
    book_id: bookId,
    ...notesQuery,
  });

  // Refresh chapters when chapter list changes elsewhere (e.g., chapters tab)
  useEffect(() => {
    if (chaptersVersion !== undefined && chaptersVersion > 0) {
      refetchChapters();
    }
  }, [chaptersVersion, refetchChapters]);

  // Build chapter options for dropdown (includes "All chapters")
  const chapterOptions: ChapterSelectOptionViewModel[] = useMemo(() => {
    const options: ChapterSelectOptionViewModel[] = [{ value: "all", label: t("book.notes.allChapters") }];

    chapters.forEach((chapter) => {
      options.push({
        value: chapter.id,
        label: chapter.title,
        chapterId: chapter.id,
      });
    });

    return options;
  }, [chapters, t]);

  // Build chaptersById lookup for note grouping
  const chaptersById = useMemo(() => {
    const map: Record<string, ChapterListItemViewModel> = {};
    chapters.forEach((chapter) => {
      map[chapter.id] = chapter;
    });
    return map;
  }, [chapters]);

  // Get sorted chapter IDs for display order
  const chapterOrderIds = useMemo(() => {
    return chapters.map((chapter) => chapter.id);
  }, [chapters]);

  // Dialog handlers
  const handleOpenAdd = () => {
    window.location.href = `${withLocalePath(locale, `/books/${bookId}/notes/add`)}${window.location.search}`;
  };

  const handleOpenNote = (noteId: string) => {
    setSelectedNoteId(noteId);
  };

  const handleCloseNote = () => {
    setSelectedNoteId(null);
  };

  const handleEditNote = () => {
    if (selectedNoteId) {
      window.location.href = `${withLocalePath(locale, `/books/${bookId}/notes/${selectedNoteId}/edit`)}${window.location.search}`;
    }
  };

  const handleNoteDeleted = () => {
    setSelectedNoteId(null);
    refetchNotes();
  };

  // Pagination handlers
  const handlePageChange = (page: number) => {
    setNotesQuery({
      ...notesQuery,
      page,
    });
  };

  const handleSizeChange = (size: number) => {
    setNotesQuery({
      ...notesQuery,
      size,
      page: 1, // Reset to page 1 when size changes
    });
  };

  // Check if "Add note" should be disabled (no chapters exist)
  const isAddDisabled = chapters.length === 0;
  const addDisabledReason = isAddDisabled ? t("book.notes.addDisabledReason") : undefined;

  const selectedNote = useMemo(() => {
    if (!selectedNoteId) return null;
    return notes.find((n) => n.id === selectedNoteId) || null;
  }, [notes, selectedNoteId]);

  const selectedNoteChapterTitle = useMemo(() => {
    if (!selectedNote) return "";
    return chaptersById[selectedNote.chapterId]?.title || "";
  }, [chaptersById, selectedNote]);

  return (
    <div className="space-y-4">
      {/* Header row with chapter filter and add button */}
      <BookNotesHeaderRow
        query={notesQuery}
        chapterOptions={chapterOptions}
        isAddDisabled={isAddDisabled}
        addDisabledReason={addDisabledReason}
        onQueryChange={setNotesQuery}
        onAdd={handleOpenAdd}
      />

      {/* Error banners */}
      {chaptersError && <InlineBanner error={chaptersError} onRetry={refetchChapters} />}
      {notesError && <InlineBanner error={notesError} onRetry={refetchNotes} />}

      {/* Notes list */}
      <BookNotesList
        loading={notesLoading || chaptersLoading}
        notes={notes}
        chaptersById={chaptersById}
        chapterOrderIds={chapterOrderIds}
        bookId={bookId}
        onOpen={handleOpenNote}
        onAdd={handleOpenAdd}
      />

      {/* Pagination controls */}
      {meta && meta.total_items > 0 && (
        <PaginationControls meta={meta} onPageChange={handlePageChange} onSizeChange={handleSizeChange} />
      )}

      {selectedNote && (
        <ViewNoteDialog
          open={true}
          onOpenChange={(open) => !open && handleCloseNote()}
          note={selectedNote}
          chapterTitle={selectedNoteChapterTitle}
          onDeleted={handleNoteDeleted}
          onEdit={handleEditNote}
        />
      )}
    </div>
  );
};
