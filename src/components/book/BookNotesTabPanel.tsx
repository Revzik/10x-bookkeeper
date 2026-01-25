interface BookNotesTabPanelProps {
  bookId: string;
}

/**
 * BookNotesTabPanel - Placeholder for notes list + CRUD UI
 *
 * To be implemented in a dedicated plan:
 * - List all notes for the book
 * - Create/edit/delete notes
 * - Filter by chapter
 * - Show embedding status
 */
export const BookNotesTabPanel = ({ bookId }: BookNotesTabPanelProps) => {
  return (
    <div className="py-8 text-center">
      <p className="text-muted-foreground">Notes will appear here.</p>
      <p className="text-xs text-muted-foreground mt-2">(Book ID: {bookId})</p>
    </div>
  );
};
