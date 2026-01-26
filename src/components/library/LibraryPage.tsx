import { useState } from "react";
import type { LibraryTabViewModel, LibraryBooksQueryViewModel, LibrarySeriesQueryViewModel } from "@/types";
import { AppHeader } from "@/components/shared/AppHeader";
import { LibraryTabs } from "@/components/library/LibraryTabs";
import { BooksTabPanel } from "@/components/library/BooksTabPanel";
import { SeriesTabPanel } from "@/components/library/SeriesTabPanel";
import { AddBookDialog } from "@/components/library/AddBookDialog";
import { AddSeriesDialog } from "@/components/library/AddSeriesDialog";
import { Button } from "@/components/ui/button";
import { useLibraryUrlState, useBooksList, useSeriesList, useSeriesOptions } from "./hooks";

interface LibraryPageProps {
  userEmail?: string;
}

/**
 * LibraryPage - Main view orchestrator for Library
 *
 * Responsibilities:
 * - URL state management (tab, query params)
 * - Data fetching for both tabs
 * - Dialog state management
 * - Refetching lists on successful creation
 *
 * Tab state strategy:
 * - Active tab: query comes from URL (source of truth)
 * - Inactive tab: query stored in component state (preserved in memory)
 * - On tab switch: current query saved to inactive state, inactive state restored to URL
 */
const LibraryPage = ({ userEmail }: LibraryPageProps) => {
  // URL state management (source of truth for active tab)
  const { activeTab, booksQuery, seriesQuery, setActiveTab, setBooksQuery, setSeriesQuery } = useLibraryUrlState();

  // Preserved query state for inactive tab
  const [inactiveBooksQuery, setInactiveBooksQuery] = useState<LibraryBooksQueryViewModel>(booksQuery);
  const [inactiveSeriesQuery, setInactiveSeriesQuery] = useState<LibrarySeriesQueryViewModel>(seriesQuery);

  // Data fetching - active tab uses URL query, inactive tab uses preserved query
  const booksData = useBooksList(activeTab === "books" ? booksQuery : inactiveBooksQuery);
  const seriesData = useSeriesList(activeTab === "series" ? seriesQuery : inactiveSeriesQuery);
  const { options: seriesOptions, refetch: refetchSeriesOptions } = useSeriesOptions();

  // Dialog state
  const [isAddBookOpen, setIsAddBookOpen] = useState(false);
  const [isAddSeriesOpen, setIsAddSeriesOpen] = useState(false);

  const handleBooksQueryChange = (next: LibraryBooksQueryViewModel) => {
    setBooksQuery(next);
  };

  const handleSeriesQueryChange = (next: LibrarySeriesQueryViewModel) => {
    setSeriesQuery(next);
  };

  const handleTabChange = (tab: LibraryTabViewModel) => {
    if (tab === activeTab) return;

    // Save current active tab's query to inactive state, then restore new tab's query from inactive state
    if (activeTab === "books") {
      // Switching from Books to Series
      setInactiveBooksQuery(booksQuery); // Save current books query
      setSeriesQuery(inactiveSeriesQuery); // Restore series query to URL
    } else {
      // Switching from Series to Books
      setInactiveSeriesQuery(seriesQuery); // Save current series query
      setBooksQuery(inactiveBooksQuery); // Restore books query to URL
    }

    setActiveTab(tab);
  };

  const handleCreatedBook = () => {
    setIsAddBookOpen(false);
    booksData.refetch();
    // Refetch series list to update book counts (in case book was added to a series)
    seriesData.refetch();
  };

  const handleCreatedSeries = () => {
    setIsAddSeriesOpen(false);
    seriesData.refetch();
    refetchSeriesOptions();
  };

  const handleRetryBooks = () => {
    booksData.refetch();
  };

  const handleRetrySeries = () => {
    seriesData.refetch();
  };

  return (
    <div className="min-h-screen">
      {/* App Header */}
      <AppHeader userEmail={userEmail} />

      <div className="container mx-auto px-4 py-8">
        {/* Page header */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Library</h1>
          <div>
            {activeTab === "books" ? (
              <Button onClick={() => setIsAddBookOpen(true)}>Add Book</Button>
            ) : (
              <Button onClick={() => setIsAddSeriesOpen(true)}>Add Series</Button>
            )}
          </div>
        </div>

        {/* Tab navigation and panels */}
        <LibraryTabs
          activeTab={activeTab}
          onTabChange={handleTabChange}
          booksPanel={
            <BooksTabPanel
              query={booksQuery}
              onQueryChange={handleBooksQueryChange}
              items={booksData.items}
              meta={booksData.meta}
              loading={booksData.loading}
              error={booksData.error}
              seriesOptions={seriesOptions}
              onRetry={handleRetryBooks}
            />
          }
          seriesPanel={
            <SeriesTabPanel
              query={seriesQuery}
              onQueryChange={handleSeriesQueryChange}
              items={seriesData.items}
              meta={seriesData.meta}
              loading={seriesData.loading}
              error={seriesData.error}
              onRetry={handleRetrySeries}
            />
          }
        />

        {/* Create dialogs */}
        <AddBookDialog
          open={isAddBookOpen}
          onOpenChange={setIsAddBookOpen}
          seriesOptions={seriesOptions}
          onCreated={handleCreatedBook}
        />

        <AddSeriesDialog open={isAddSeriesOpen} onOpenChange={setIsAddSeriesOpen} onCreated={handleCreatedSeries} />
      </div>
    </div>
  );
};

export default LibraryPage;
