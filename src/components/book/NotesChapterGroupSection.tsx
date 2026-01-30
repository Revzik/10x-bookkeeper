import type { ChapterListItemViewModel, NoteListItemViewModel } from "@/types";
import { NoteCard } from "@/components/book/NoteCard";
import { useT } from "@/i18n/react";

interface NotesChapterGroupSectionProps {
  bookId: string;
  chapter: ChapterListItemViewModel;
  notes: NoteListItemViewModel[];
  onOpen: (noteId: string) => void;
}

/**
 * NotesChapterGroupSection - Display a chapter heading and its notes
 *
 * Layout:
 * - Chapter heading with title
 * - Notes displayed in a responsive wrap layout (cards side-by-side, wrapping on overflow)
 *
 * Card sizing:
 * - Mobile: full width
 * - sm+: 2 columns (50% each minus gap)
 * - lg+: 3 columns (33.33% each minus gap)
 */
export const NotesChapterGroupSection = ({ chapter, notes, onOpen }: NotesChapterGroupSectionProps) => {
  const { t } = useT();
  const countKey = notes.length === 1 ? "book.notes.noteCountOne" : "book.notes.noteCountMany";

  return (
    <div className="space-y-3">
      {/* Chapter heading */}
      <div className="flex items-center gap-2">
        <h3 className="text-base font-semibold text-foreground">{chapter.title}</h3>
        <span className="text-sm text-muted-foreground">({t(countKey, { count: notes.length })})</span>
      </div>

      {/* Notes wrap layout */}
      <div className="flex flex-wrap gap-3">
        {notes.map((note) => (
          <NoteCard key={note.id} note={note} onOpen={() => onOpen(note.id)} />
        ))}
      </div>
    </div>
  );
};
