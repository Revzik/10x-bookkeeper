import { useState, useMemo } from "react";
import { useNoteMutations } from "@/hooks/useNoteMutations";
import { useChaptersList } from "@/components/book/hooks/useChaptersList";
import { useBookUrlState } from "@/components/book/hooks/useBookUrlState";
import { NoteForm } from "./NoteForm";
import { I18nProvider, useT } from "@/i18n/react";
import { InlineBanner } from "@/components/library/InlineBanner";
import { EntrySkeleton } from "@/components/shared/EntrySkeleton";
import { AppHeader } from "@/components/shared/AppHeader";
import { useBookById } from "@/components/book/hooks/useBookById";
import { withLocalePath } from "@/i18n";

interface AddNotePageProps {
  bookId: string;
  locale?: string | null;
}

const AddNotePageContent = ({ bookId }: AddNotePageProps) => {
  const { t, locale } = useT();
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [serverFieldErrors, setServerFieldErrors] = useState<Record<string, string>>({});
  const { createNote, isCreating } = useNoteMutations();

  const { book, loading: bookLoading, error: bookError } = useBookById(bookId);
  const { items: chapters, loading: chaptersLoading, error: chaptersError } = useChaptersList(bookId);
  const { notesQuery } = useBookUrlState();

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

  const handleSubmit = async (data: { chapter_id: string; content: string }) => {
    setGeneralError(null);
    setServerFieldErrors({});

    const result = await createNote(data.chapter_id, {
      content: data.content.trim(),
    });

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

  if (chaptersLoading || bookLoading) {
    return (
      <div className="min-h-screen">
        <AppHeader showBackToLibrary />
        <EntrySkeleton count={1} />
      </div>
    );
  }

  const hasError = chaptersError || bookError;

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

  const initialChapterId = notesQuery.chapter_id || (chapters.length > 0 ? chapters[0].id : "");

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader showBackToLibrary />
      <div className="flex-1 mx-auto max-w-2xl w-full px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="mb-6 text-2xl font-bold">{t("note.addTitle")}</h1>
        <NoteForm
          bookTitle={book?.title || ""}
          initialChapterId={initialChapterId}
          initialContent=""
          chapterOptions={chapterOptions}
          isSubmitting={isCreating}
          submitLabel={t("note.create")}
          submittingLabel={t("note.creating")}
          generalError={generalError}
          serverFieldErrors={serverFieldErrors}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
};

export default function AddNotePage({ locale, ...props }: AddNotePageProps) {
  return (
    <I18nProvider locale={locale}>
      <AddNotePageContent {...props} locale={locale} />
    </I18nProvider>
  );
}
