interface BookChaptersTabPanelProps {
  bookId: string;
}

/**
 * BookChaptersTabPanel - Placeholder for chapter management UI
 *
 * To be implemented in a dedicated plan:
 * - List chapters in order
 * - Create/edit/delete chapters
 * - Reorder chapters
 */
export const BookChaptersTabPanel = ({ bookId }: BookChaptersTabPanelProps) => {
  return (
    <div className="py-8 text-center">
      <p className="text-muted-foreground">Chapters will appear here.</p>
      <p className="text-xs text-muted-foreground mt-2">(Book ID: {bookId})</p>
    </div>
  );
};
