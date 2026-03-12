import { useState, useMemo } from "react";
import { useNoteMutations } from "@/hooks/useNoteMutations";
import { useChaptersList } from "@/components/book/hooks/useChaptersList";
import { useNotesList } from "../book/hooks/useNotesList";
import { NoteForm } from "./NoteForm";
import { I18nProvider, useT } from "@/i18n/react";
import { InlineBanner } from "@/components/library/InlineBanner";
import { EntrySkeleton } from "@/components/shared/EntrySkeleton";
import { AppHeader } from "@/components/shared/AppHeader";
import { useBookById } from "@/components/book/hooks/useBookById";
import type { UpdateNoteCommand } from "@/types";
import { withLocalePath } from "@/i18n";

interface EditNotePageProps {
  bookId: string;
  noteId: string;
  locale?: string | null;
}

const EditNotePageContent = ({ bookId, noteId }: EditNotePageProps) => {
  const { t, locale } = useT();
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [serverFieldErrors, setServerFieldErrors] = useState<Record<string, string>>({});
  const { updateNote, isUpdating } = useNoteMutations();

  const { book, loading: bookLoading, error: bookError } = useBookById(bookId);
  const { items: chapters, loading: chaptersLoading, error: chaptersError } = useChaptersList(bookId);
  // Fetch just this note to get its current state.
  // The notes API might not allow single note fetch easily by id in MVP, but we can reuse useNotesList and filter,
  // or ideally we'd have a getNote endpoint. Assuming we can find it in the list for now if we fetch recent notes,
  // or let's use the list but without limits if possible, or build a simple fetch just for this note if needed.
  // Actually, the PRD says notes are gathered by book.
  const {
    items: notes,
    loading: notesLoading,
    error: notesError,
  } = useNotesList({ book_id: bookId, page: 1, size: 100 });

  const note = useMemo(() => notes.find((n) => n.id === noteId), [notes, noteId]);

  const isLoading = chaptersLoading || notesLoading || bookLoading;
  const hasError = chaptersError || notesError || bookError;

  const chapterOptions = useMemo(() => {
    return chapters.map((chapter) => ({
      value: chapter.id,
      label: chapter.title,
      chapterId: chapter.id,
    }));
  }, [chapters]);

  const handleCancel = () => {
    window.location.href = `${withLocalePath(locale, `/books/${bookId}`)}?tab=notes`;
  };

  const handleSubmit = async (data: { chapter_id: string; content: string }, dirtyFields: Record<string, boolean>) => {
    setGeneralError(null);
    setServerFieldErrors({});

    const hasChanges = Object.keys(dirtyFields).length > 0;
    if (!hasChanges) {
      setGeneralError(t("dialogs.common.noChanges"));
      return;
    }

    const command: UpdateNoteCommand = {};
    if (dirtyFields.content) {
      command.content = data.content.trim();
    }
    if (dirtyFields.chapter_id) {
      command.chapter_id = data.chapter_id;
    }

    const result = await updateNote(noteId, command);

    if (result.success) {
      window.location.href = `${withLocalePath(locale, `/books/${bookId}`)}?tab=notes`;
    } else {
      if (result.error?.fieldErrors) {
        setServerFieldErrors(result.error.fieldErrors);
      }
      if (result.error?.generalError) {
        setGeneralError(result.error.generalError);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <AppHeader showBackToLibrary />
        <EntrySkeleton count={1} />
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="min-h-screen">
        <AppHeader showBackToLibrary />
        <div className="p-4">
          <InlineBanner error={hasError} />
          <button onClick={handleCancel} className="mt-4 text-primary hover:underline">
            {t("common.actions.cancel")}
          </button>
        </div>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="min-h-screen">
        <AppHeader showBackToLibrary />
        <div className="p-4">
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            Note not found.
          </div>
          <button onClick={handleCancel} className="mt-4 text-primary hover:underline">
            {t("common.actions.cancel")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader showBackToLibrary />
      <div className="flex-1 mx-auto max-w-2xl w-full px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="mb-6 text-2xl font-bold">{t("common.actions.edit")} Note</h1>
        <NoteForm
          bookTitle={book?.title || ""}
          initialChapterId={note.chapterId}
          initialContent={note.content}
          chapterOptions={chapterOptions}
          isSubmitting={isUpdating}
          submitLabel={t("common.actions.save")}
          submittingLabel={t("dialogs.common.saving")}
          generalError={generalError}
          serverFieldErrors={serverFieldErrors}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
};

export default function EditNotePage({ locale, ...props }: EditNotePageProps) {
  return (
    <I18nProvider locale={locale}>
      <EditNotePageContent {...props} locale={locale} />
    </I18nProvider>
  );
}
