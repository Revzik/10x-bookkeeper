import { useState, useRef, useEffect } from "react";
import type { BookTabViewModel } from "@/types";
import { useBookUrlState, useBookById } from "./hooks";
import { useSeriesOptions } from "@/components/library/hooks/useSeriesOptions";
import { BookStickyHeader } from "@/components/book/BookStickyHeader";
import { BookTabsBar } from "@/components/book/BookTabsBar";
import { BookChaptersTabPanel } from "@/components/book/BookChaptersTabPanel";
import { BookNotesTabPanel } from "@/components/book/BookNotesTabPanel";
import { BookAskTabPanel } from "@/components/book/BookAskTabPanel";
import { EditBookDialog } from "@/components/book/EditBookDialog";
import { DeleteBookDialog } from "@/components/book/DeleteBookDialog";
import { InlineBanner } from "@/components/library/InlineBanner";
import { Button } from "@/components/ui/button";

interface BookDetailPageProps {
  bookId: string;
}

/**
 * BookDetailPage - Main view orchestrator for Book Detail
 *
 * Responsibilities:
 * - URL state management (tab, askScope)
 * - Book data fetching
 * - Dialog state management (edit/delete)
 * - Tab switching and content rendering
 * - Dynamic header height tracking for sticky tabs positioning
 */
const BookDetailPage = ({ bookId }: BookDetailPageProps) => {
  // URL state management (source of truth for active tab)
  const { activeTab, askScope, setActiveTab } = useBookUrlState();

  // Book data fetching
  const { book, loading, error, notFound, refetch } = useBookById(bookId);

  // Series options for edit dialog
  const { options: seriesOptions } = useSeriesOptions();

  // Dialog state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Header height tracking for sticky tabs positioning
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(120);

  // Measure header height and update on resize or content changes
  useEffect(() => {
    if (!headerRef.current) return;

    const updateHeaderHeight = () => {
      if (headerRef.current) {
        const height = headerRef.current.offsetHeight;
        setHeaderHeight(height);
      }
    };

    // Initial measurement
    updateHeaderHeight();

    // Update on window resize
    const resizeObserver = new ResizeObserver(updateHeaderHeight);
    resizeObserver.observe(headerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [book]);

  const handleTabChange = (tab: BookTabViewModel) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
  };

  const handleEdit = () => {
    setIsEditOpen(true);
  };

  const handleDelete = () => {
    setIsDeleteOpen(true);
  };

  const handleUpdatedBook = () => {
    setIsEditOpen(false);
    refetch();
  };

  const handleDeletedBook = () => {
    // Navigate to /library?tab=books
    window.location.href = "/library?tab=books";
  };

  // Handle not found state
  if (notFound) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold">Book not found</h1>
            <p className="text-muted-foreground">It may have been deleted or the link is incorrect.</p>
            <Button onClick={() => (window.location.href = "/library?tab=books")}>Back to Library</Button>
          </div>
        </div>
      </div>
    );
  }

  // Handle loading state
  if (loading || !book) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-muted-foreground">Loading book...</p>
        </div>
      </div>
    );
  }

  // Handle error state (non-404 errors)
  if (error) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-16">
          <InlineBanner error={error} onRetry={refetch} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Sticky Header */}
      <div ref={headerRef}>
        <BookStickyHeader book={book} onEdit={handleEdit} onDelete={handleDelete} />
      </div>

      {/* Sticky Tabs Bar */}
      <BookTabsBar activeTab={activeTab} onTabChange={handleTabChange} headerHeight={headerHeight} />

      {/* Tab Content */}
      <div className="container mx-auto px-4 py-6">
        <div className={activeTab === "chapters" ? "" : "hidden"}>
          <BookChaptersTabPanel bookId={bookId} />
        </div>
        <div className={activeTab === "notes" ? "" : "hidden"}>
          <BookNotesTabPanel bookId={bookId} />
        </div>
        <div className={activeTab === "ask" ? "" : "hidden"}>
          <BookAskTabPanel bookId={bookId} defaultScope={askScope} />
        </div>
      </div>

      {/* Edit Book Dialog */}
      {book && (
        <EditBookDialog
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          book={book}
          seriesOptions={seriesOptions}
          onUpdated={handleUpdatedBook}
        />
      )}

      {/* Delete Book Dialog */}
      {book && (
        <DeleteBookDialog
          open={isDeleteOpen}
          onOpenChange={setIsDeleteOpen}
          bookId={book.id}
          bookTitle={book.title}
          onDeleted={handleDeletedBook}
        />
      )}
    </div>
  );
};

export default BookDetailPage;
