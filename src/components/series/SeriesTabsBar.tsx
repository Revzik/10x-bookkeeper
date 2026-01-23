import type { SeriesTabViewModel } from "@/types";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SeriesTabsBarProps {
  activeTab: SeriesTabViewModel;
  onTabChange: (tab: SeriesTabViewModel) => void;
}

/**
 * SeriesTabsBar - Sticky tab bar for Books/Ask navigation
 *
 * Features:
 * - Sticky positioning beneath the series header
 * - Accessible tab navigation
 * - URL-backed active tab state
 */
export const SeriesTabsBar = ({ activeTab, onTabChange }: SeriesTabsBarProps) => {
  return (
    <div className="sticky top-[var(--header-height,120px)] z-10 border-b bg-background">
      <div className="container mx-auto px-4">
        <Tabs value={activeTab} onValueChange={(value) => onTabChange(value as SeriesTabViewModel)}>
          <TabsList>
            <TabsTrigger value="books">Books</TabsTrigger>
            <TabsTrigger value="ask">Ask</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </div>
  );
};
