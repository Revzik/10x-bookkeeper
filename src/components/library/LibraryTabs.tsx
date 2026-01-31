import type { ReactNode } from "react";
import type { LibraryTabViewModel } from "@/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useT } from "@/i18n/react";

interface LibraryTabsProps {
  activeTab: LibraryTabViewModel;
  onTabChange: (tab: LibraryTabViewModel) => void;
  booksPanel: ReactNode;
  seriesPanel: ReactNode;
}

/**
 * LibraryTabs - Accessible tab switching between Books and Series
 */
export const LibraryTabs = ({ activeTab, onTabChange, booksPanel, seriesPanel }: LibraryTabsProps) => {
  const { t } = useT();
  return (
    <Tabs value={activeTab} onValueChange={(value) => onTabChange(value as LibraryTabViewModel)}>
      <TabsList>
        <TabsTrigger value="books" data-testid="tab-books">
          {t("library.tabs.books")}
        </TabsTrigger>
        <TabsTrigger value="series" data-testid="tab-series">
          {t("library.tabs.series")}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="books" data-testid="tab-panel-books">
        {booksPanel}
      </TabsContent>
      <TabsContent value="series" data-testid="tab-panel-series">
        {seriesPanel}
      </TabsContent>
    </Tabs>
  );
};
