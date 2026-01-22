import { useState, useEffect } from "react";
import type { LibraryTabViewModel, LibraryBooksQueryViewModel, LibrarySeriesQueryViewModel } from "@/types";
import { LibraryTabs } from "@/components/library/LibraryTabs";
import { BooksTabPanel } from "@/components/library/BooksTabPanel";
import { SeriesTabPanel } from "@/components/library/SeriesTabPanel";
import { AddBookDialog } from "@/components/library/AddBookDialog";
import { AddSeriesDialog } from "@/components/library/AddSeriesDialog";
import { Button } from "@/components/ui/button";
import { useLibraryUrlState, useBooksList, useSeriesList, useSeriesOptions } from "./hooks";

/**
 * LibraryPage - Main view orchestrator for Library
 *
 * Responsibilities:
 * - URL state management (tab, query params)
 * - Data fetching for both tabs
 * - Dialog state management
 * - Refetching lists on successful creation
 */
const LibraryPage = () => {
  // URL state management
  const { activeTab, booksQuery, seriesQuery, setActiveTab, setBooksQuery, setSeriesQuery } = useLibraryUrlState();

  // Preserve each tab's query params in memory when switching tabs
  const [savedBooksQuery, setSavedBooksQuery] = useState<LibraryBooksQueryViewModel>(booksQuery);
  const [savedSeriesQuery, setSavedSeriesQuery] = useState<LibrarySeriesQueryViewModel>(seriesQuery);

  // Update saved queries when the active tab's query changes
  useEffect(() => {
    if (activeTab === "books") {
      setSavedBooksQuery(booksQuery);
    } else {
      setSavedSeriesQuery(seriesQuery);
    }
  }, [activeTab, booksQuery, seriesQuery]);

  // Data fetching - use active query for current tab, saved query for inactive tab
  const booksData = useBooksList(activeTab === "books" ? booksQuery : savedBooksQuery);
  const seriesData = useSeriesList(activeTab === "series" ? seriesQuery : savedSeriesQuery);
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

    // Preserve current tab's query and restore next tab's query
    if (tab === "books") {
      setBooksQuery(savedBooksQuery);
    } else {
      setSeriesQuery(savedSeriesQuery);
    }

    setActiveTab(tab);
  };

  const handleCreatedBook = () => {
    setIsAddBookOpen(false);
    booksData.refetch();
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
  );
};

export default LibraryPage;
