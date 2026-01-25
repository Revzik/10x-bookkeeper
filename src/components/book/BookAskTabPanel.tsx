import type { BookAskScopeViewModel } from "@/types";

interface BookAskTabPanelProps {
  bookId: string;
  defaultScope?: BookAskScopeViewModel;
}

/**
 * BookAskTabPanel - Placeholder for book-scoped Q&A UI
 *
 * To be implemented in a dedicated plan:
 * - Chat interface for asking questions about the book
 * - Scope toggle (book vs series)
 * - Message history
 * - AI response streaming
 */
export const BookAskTabPanel = ({ bookId, defaultScope = "book" }: BookAskTabPanelProps) => {
  return (
    <div className="py-8 text-center">
      <p className="text-muted-foreground">Ask will appear here.</p>
      <p className="text-xs text-muted-foreground mt-2">
        Book ID: {bookId} | Default scope: {defaultScope}
      </p>
    </div>
  );
};
