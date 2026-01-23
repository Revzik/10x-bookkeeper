import { useState } from "react";
import type { SeriesTabViewModel } from "@/types";
import { useSeriesUrlState, useSeriesById } from "./hooks";
import { SeriesStickyHeader } from "@/components/series/SeriesStickyHeader";
import { SeriesTabsBar } from "@/components/series/SeriesTabsBar";
import { SeriesBooksTabPanel } from "@/components/series/SeriesBooksTabPanel";
import { SeriesAskTabPanel } from "@/components/series/SeriesAskTabPanel";
import { SeriesNotFoundState } from "@/components/series/SeriesNotFoundState";
import { EditSeriesDialog } from "@/components/series/EditSeriesDialog";
import { DeleteSeriesDialog } from "@/components/series/DeleteSeriesDialog";
import { InlineBanner } from "@/components/library/InlineBanner";

interface SeriesDetailPageProps {
  seriesId: string;
}

/**
 * SeriesDetailPage - Main view orchestrator for Series Detail
 *
 * Responsibilities:
 * - URL state management (tab, query params)
 * - Series data fetching
 * - Dialog state management (edit/delete)
 * - Tab switching and content rendering
 */
const SeriesDetailPage = ({ seriesId }: SeriesDetailPageProps) => {
  // URL state management (source of truth for active tab)
  const { activeTab, booksQuery, setActiveTab, setBooksQuery } = useSeriesUrlState();

  // Series data fetching
  const { series, loading, error, notFound, refetch } = useSeriesById(seriesId);

  // Dialog state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const handleTabChange = (tab: SeriesTabViewModel) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
  };

  const handleEdit = () => {
    setIsEditOpen(true);
  };

  const handleDelete = () => {
    setIsDeleteOpen(true);
  };

  const handleEditedSeries = () => {
    setIsEditOpen(false);
    refetch();
  };

  const handleDeletedSeries = () => {
    // Navigate to /library?tab=series
    window.location.href = "/library?tab=series";
  };

  // Handle not found state
  if (notFound) {
    return <SeriesNotFoundState />;
  }

  // Handle loading state
  if (loading || !series) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-muted-foreground">Loading series...</p>
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
      <SeriesStickyHeader series={series} onEdit={handleEdit} onDelete={handleDelete} />

      {/* Sticky Tabs Bar */}
      <SeriesTabsBar activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Tab Content */}
      <div className="container mx-auto px-4 py-6">
        {activeTab === "books" ? (
          <SeriesBooksTabPanel seriesId={seriesId} query={booksQuery} onQueryChange={setBooksQuery} />
        ) : (
          <SeriesAskTabPanel seriesId={seriesId} />
        )}
      </div>

      {/* Edit Series Dialog */}
      <EditSeriesDialog open={isEditOpen} onOpenChange={setIsEditOpen} series={series} onUpdated={handleEditedSeries} />

      {/* Delete Series Dialog */}
      <DeleteSeriesDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        seriesId={series.id}
        seriesTitle={series.title}
        onDeleted={handleDeletedSeries}
      />
    </div>
  );
};

export default SeriesDetailPage;
