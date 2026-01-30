import { useState, useRef, useEffect } from "react";
import type { SeriesTabViewModel } from "@/types";
import { useSeriesUrlState, useSeriesById } from "./hooks";
import { AppHeader, APP_HEADER_HEIGHT } from "@/components/shared/AppHeader";
import { SeriesStickyHeader } from "@/components/series/SeriesStickyHeader";
import { SeriesTabsBar } from "@/components/series/SeriesTabsBar";
import { SeriesBooksTabPanel } from "@/components/series/SeriesBooksTabPanel";
import { SeriesAskTabPanel } from "@/components/series/SeriesAskTabPanel";
import { SeriesNotFoundState } from "@/components/series/SeriesNotFoundState";
import { EditSeriesDialog } from "@/components/series/EditSeriesDialog";
import { DeleteSeriesDialog } from "@/components/series/DeleteSeriesDialog";
import { InlineBanner } from "@/components/library/InlineBanner";
import { I18nProvider, useT } from "@/i18n/react";
import { withLocalePath } from "@/i18n";

interface SeriesDetailPageProps {
  seriesId: string;
  userEmail?: string;
  locale?: string | null;
}

/**
 * SeriesDetailPage - Main view orchestrator for Series Detail
 *
 * Responsibilities:
 * - URL state management (tab, query params)
 * - Series data fetching
 * - Dialog state management (edit/delete)
 * - Tab switching and content rendering
 * - Dynamic header height tracking for sticky tabs positioning
 */
const SeriesDetailPageContent = ({ seriesId, userEmail }: SeriesDetailPageProps) => {
  const { t, locale } = useT();
  // URL state management (source of truth for active tab)
  const { activeTab, setActiveTab } = useSeriesUrlState();

  // Series data fetching
  const { series, loading, error, notFound, refetch } = useSeriesById(seriesId);

  // Dialog state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Header height tracking for sticky tabs positioning
  // Note: Total height = AppHeader + SeriesStickyHeader (dynamic)
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(120);

  // Measure header height and update on resize or content changes
  useEffect(() => {
    if (!headerRef.current) return;

    const updateHeaderHeight = () => {
      if (headerRef.current) {
        const height = headerRef.current.offsetHeight;
        setHeaderHeight(height + APP_HEADER_HEIGHT);
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
  }, [series]);

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
    window.location.href = `${withLocalePath(locale, "/library")}?tab=series`;
  };

  // Handle not found state
  if (notFound) {
    return <SeriesNotFoundState userEmail={userEmail} />;
  }

  // Handle loading state
  if (loading || !series) {
    return (
      <div className="min-h-screen">
        <AppHeader showBackToLibrary userEmail={userEmail} />
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-muted-foreground">{t("series.loading")}</p>
        </div>
      </div>
    );
  }

  // Handle error state (non-404 errors)
  if (error) {
    return (
      <div className="min-h-screen">
        <AppHeader showBackToLibrary userEmail={userEmail} />
        <div className="container mx-auto px-4 py-16">
          <InlineBanner error={error} onRetry={refetch} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* App Header */}
      <AppHeader showBackToLibrary userEmail={userEmail} />

      {/* Sticky Series Header */}
      <SeriesStickyHeader ref={headerRef} series={series} onEdit={handleEdit} onDelete={handleDelete} />

      {/* Sticky Tabs Bar */}
      <SeriesTabsBar activeTab={activeTab} onTabChange={handleTabChange} headerHeight={headerHeight} />

      {/* Tab Content */}
      <div className="container mx-auto px-4 py-6">
        <div className={activeTab === "books" ? "" : "hidden"}>
          <SeriesBooksTabPanel seriesId={seriesId} />
        </div>
        <div className={activeTab === "ask" ? "" : "hidden"}>
          <SeriesAskTabPanel seriesId={seriesId} />
        </div>
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

const SeriesDetailPage = ({ locale, ...props }: SeriesDetailPageProps) => {
  return (
    <I18nProvider locale={locale}>
      <SeriesDetailPageContent {...props} locale={locale} />
    </I18nProvider>
  );
};

export default SeriesDetailPage;
