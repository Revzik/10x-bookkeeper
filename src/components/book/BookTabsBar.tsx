import type { BookTabViewModel } from "@/types";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useT } from "@/i18n/react";

interface BookTabsBarProps {
  activeTab: BookTabViewModel;
  onTabChange: (tab: BookTabViewModel) => void;
  headerHeight: number;
}

/**
 * BookTabsBar - Sticky tab bar for Chapters/Notes/Ask navigation
 *
 * Features:
 * - Sticky positioning beneath the book header
 * - Dynamic positioning based on actual header height (responsive)
 * - Accessible tab navigation
 * - URL-backed active tab state
 */
export const BookTabsBar = ({ activeTab, onTabChange, headerHeight }: BookTabsBarProps) => {
  const { t } = useT();

  return (
    <div className="sticky z-10 border-b bg-background" style={{ top: `${headerHeight}px` }}>
      <div className="container mx-auto px-4">
        <Tabs value={activeTab} onValueChange={(value) => onTabChange(value as BookTabViewModel)}>
          <TabsList>
            <TabsTrigger value="notes">{t("book.tabs.notes")}</TabsTrigger>
            <TabsTrigger value="chapters">{t("book.tabs.chapters")}</TabsTrigger>
            <TabsTrigger value="ask">{t("book.tabs.ask")}</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </div>
  );
};
