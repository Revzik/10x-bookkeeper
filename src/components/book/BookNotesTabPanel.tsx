import { useState, useMemo } from "react";
import type { NoteListItemViewModel, ChapterListItemViewModel, ChapterSelectOptionViewModel } from "@/types";
import { useBookUrlState } from "./hooks/useBookUrlState";
import { useChaptersList } from "./hooks/useChaptersList";
import { useNotesList } from "./hooks/useNotesList";
import { BookNotesHeaderRow } from "./BookNotesHeaderRow";
import { BookNotesList } from "./BookNotesList";
import { AddNoteDialog } from "./AddNoteDialog";
import { ViewEditNoteDialog } from "./ViewEditNoteDialog";
import { InlineBanner } from "@/components/library/InlineBanner";
import { PaginationControls } from "@/components/library/PaginationControls";
import { useT } from "@/i18n/react";

interface BookNotesTabPanelProps {
  bookId: string;
}

/**
 * BookNotesTabPanel - Notes management UI for a book
 *
 * Features:
 * - Filter notes by chapter (All chapters or specific chapter)
 * - Paginated notes list grouped by chapter
 * - Create/view/edit/delete notes via NoteDialog
 * - URL-backed state for filters and pagination
 */
export const BookNotesTabPanel = ({ bookId }: BookNotesTabPanelProps) => {
  const { t } = useT();
  const { notesQuery, setNotesQuery } = useBookUrlState();

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

  // Dialog state
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isViewEditDialogOpen, setIsViewEditDialogOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<NoteListItemViewModel | null>(null);

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

  // Build chapter options for dialog (excludes "All chapters")
  const chapterOptionsForDialog: ChapterSelectOptionViewModel[] = useMemo(() => {
    return chapters.map((chapter) => ({
      value: chapter.id,
      label: chapter.title,
      chapterId: chapter.id,
    }));
  }, [chapters]);

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
    setIsAddDialogOpen(true);
  };

  const handleOpenNote = (noteId: string) => {
    const note = notes.find((n) => n.id === noteId);
    if (note) {
      setSelectedNote(note);
      setIsViewEditDialogOpen(true);
    }
  };

  const handleNoteCreated = () => {
    setIsAddDialogOpen(false);
    refetchNotes();
  };

  const handleNoteUpdated = () => {
    setIsViewEditDialogOpen(false);
    setSelectedNote(null);
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

  // Get chapter title for dialog (when viewing existing note)
  const selectedNoteChapterTitle = selectedNote ? chaptersById[selectedNote.chapterId]?.title : undefined;

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

      {/* Add note dialog */}
      <AddNoteDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        chapterOptions={chapterOptionsForDialog}
        initialChapterId={notesQuery.chapter_id}
        onCreated={handleNoteCreated}
      />

      {/* View/Edit note dialog */}
      {selectedNote && (
        <ViewEditNoteDialog
          open={isViewEditDialogOpen}
          onOpenChange={setIsViewEditDialogOpen}
          note={selectedNote}
          chapterOptions={chapterOptionsForDialog}
          chapterTitle={selectedNoteChapterTitle || t("book.notes.unknownChapter")}
          onUpdated={handleNoteUpdated}
        />
      )}
    </div>
  );
};
