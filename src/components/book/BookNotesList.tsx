import { useMemo } from "react";
import type { NoteListItemViewModel, ChapterListItemViewModel, NotesByChapterViewModel } from "@/types";
import { EntrySkeleton } from "@/components/shared/EntrySkeleton";
import { NotesChapterGroupSection } from "@/components/book/NotesChapterGroupSection";
import { Button } from "@/components/ui/button";

interface BookNotesListProps {
  loading: boolean;
  notes: NoteListItemViewModel[];
  chaptersById: Record<string, ChapterListItemViewModel>;
  chapterOrderIds: string[];
  bookId: string;
  onOpen: (noteId: string) => void;
  onAdd: () => void;
}

/**
 * BookNotesList - Display notes list with loading/empty states and grouped display
 *
 * States:
 * - Loading: Shows skeleton
 * - Empty (no notes): Shows empty state with "Add note" CTA
 * - Non-empty: Groups notes by chapter and displays them in chapter order (ascending)
 *
 * Grouping:
 * - Notes are grouped by chapter_id
 * - Chapters are sorted by their order field (ascending)
 * - Within each chapter, notes appear in API order
 */
export const BookNotesList = ({
  loading,
  notes,
  chaptersById,
  chapterOrderIds,
  bookId,
  onOpen,
  onAdd,
}: BookNotesListProps) => {
  // Group notes by chapter and sort by chapter order
  const notesByChapter = useMemo(() => {
    const grouped: NotesByChapterViewModel = {};

    for (const note of notes) {
      if (!grouped[note.chapterId]) {
        grouped[note.chapterId] = [];
      }
      grouped[note.chapterId].push(note);
    }

    return grouped;
  }, [notes]);

  // Get sorted chapter IDs that have notes
  const chaptersWithNotes = useMemo(() => {
    return chapterOrderIds.filter((chapterId) => notesByChapter[chapterId]?.length > 0);
  }, [chapterOrderIds, notesByChapter]);

  if (loading) {
    return <EntrySkeleton count={3} />;
  }

  if (notes.length === 0) {
    const hasChapters = chapterOrderIds.length > 0;

    return (
      <div className="rounded-lg border border-border bg-card p-12 text-center">
        <p className="mb-4 text-foreground">No notes yet</p>
        {hasChapters ? (
          <>
            <p className="mb-4 text-sm text-muted-foreground">
              Start adding notes to capture insights from your reading
            </p>
            <Button onClick={onAdd} size="sm">
              Add your first note
            </Button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Add chapters first to organize your notes by book sections</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {chaptersWithNotes.map((chapterId) => {
        const chapter = chaptersById[chapterId];
        const chapterNotes = notesByChapter[chapterId];

        if (!chapter || !chapterNotes) return null;

        return (
          <NotesChapterGroupSection
            key={chapterId}
            bookId={bookId}
            chapter={chapter}
            notes={chapterNotes}
            onOpen={onOpen}
          />
        );
      })}
    </div>
  );
};
