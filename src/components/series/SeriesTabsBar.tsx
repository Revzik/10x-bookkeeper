import type { SeriesTabViewModel } from "@/types";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useT } from "@/i18n/react";

interface SeriesTabsBarProps {
  activeTab: SeriesTabViewModel;
  onTabChange: (tab: SeriesTabViewModel) => void;
  headerHeight: number;
}

/**
 * SeriesTabsBar - Sticky tab bar for Books/Ask navigation
 *
 * Features:
 * - Sticky positioning beneath the series header
 * - Dynamic positioning based on actual header height
 * - Accessible tab navigation
 * - URL-backed active tab state
 */
export const SeriesTabsBar = ({ activeTab, onTabChange, headerHeight }: SeriesTabsBarProps) => {
  const { t } = useT();

  return (
    <div className="sticky z-10 border-b bg-background" style={{ top: `${headerHeight}px` }}>
      <div className="container mx-auto px-4">
        <Tabs value={activeTab} onValueChange={(value) => onTabChange(value as SeriesTabViewModel)}>
          <TabsList>
            <TabsTrigger value="books">{t("series.tabs.books")}</TabsTrigger>
            <TabsTrigger value="ask">{t("series.tabs.ask")}</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </div>
  );
};
