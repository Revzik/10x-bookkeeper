import type { BookAskScopeViewModel } from "@/types";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useT } from "@/i18n/react";

interface ScopeSwitchProps {
  value: BookAskScopeViewModel;
  seriesEnabled: boolean;
  onChange: (value: BookAskScopeViewModel) => void;
}

/**
 * ScopeSwitch - Accessible, compact book/series scope toggle.
 *
 * Uses shadcn Tabs as a 2-option segmented control.
 * Features:
 * - "This book" option (always enabled)
 * - "This series" option (disabled when series unavailable)
 * - Guard clause prevents selection of disabled series option
 */
export const ScopeSwitch = ({ value, seriesEnabled, onChange }: ScopeSwitchProps) => {
  const { t } = useT();
  const handleValueChange = (newValue: string) => {
    // Guard clause: prevent selection of series if disabled
    if (newValue === "series" && !seriesEnabled) {
      return;
    }

    onChange(newValue as BookAskScopeViewModel);
  };

  return (
    <Tabs value={value} onValueChange={handleValueChange}>
      <TabsList>
        <TabsTrigger value="book">{t("ai.chat.scopeBook")}</TabsTrigger>
        <TabsTrigger value="series" disabled={!seriesEnabled}>
          {t("ai.chat.scopeSeries")}
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
};
