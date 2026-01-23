import { useState, useRef, useEffect } from "react";
import type { BookTabViewModel } from "@/types";
import { useBookUrlState } from "./hooks/useBookUrlState";
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

  // TODO: Book data fetching (step 4)
  const book = null;
  const loading = true;
  const error = null;
  const notFound = false;

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
    // TODO: refetch book data
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
          <InlineBanner error={error} onRetry={() => {}} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* TODO: Sticky Header (step 7) */}
      <div ref={headerRef} className="bg-background border-b">
        <div className="container mx-auto px-4 py-6">
          <p className="text-sm text-muted-foreground">Header placeholder (bookId: {bookId})</p>
        </div>
      </div>

      {/* TODO: Sticky Tabs Bar (step 10) */}
      <div className="sticky bg-background border-b z-10" style={{ top: `${headerHeight}px` }}>
        <div className="container mx-auto px-4">
          <div className="flex gap-4 py-2">
            <Button
              variant="ghost"
              onClick={() => handleTabChange("chapters")}
              className={activeTab === "chapters" ? "font-bold" : ""}
            >
              Chapters
            </Button>
            <Button
              variant="ghost"
              onClick={() => handleTabChange("notes")}
              className={activeTab === "notes" ? "font-bold" : ""}
            >
              Notes
            </Button>
            <Button
              variant="ghost"
              onClick={() => handleTabChange("ask")}
              className={activeTab === "ask" ? "font-bold" : ""}
            >
              Ask
            </Button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="container mx-auto px-4 py-6">
        <div className={activeTab === "chapters" ? "" : "hidden"}>
          <p className="text-muted-foreground">Chapters will appear here.</p>
        </div>
        <div className={activeTab === "notes" ? "" : "hidden"}>
          <p className="text-muted-foreground">Notes will appear here.</p>
        </div>
        <div className={activeTab === "ask" ? "" : "hidden"}>
          <p className="text-muted-foreground">Ask will appear here. (Current scope: {askScope})</p>
        </div>
      </div>

      {/* TODO: Edit Book Dialog (step 8) */}
      {/* TODO: Delete Book Dialog (step 9) */}
    </div>
  );
};

export default BookDetailPage;
