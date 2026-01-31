import { useState, useEffect } from "react";
import type { LibrarySeriesQueryViewModel } from "@/types";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useDebouncedValue } from "./hooks";
import { useT } from "@/i18n/react";

interface SeriesToolbarProps {
  query: LibrarySeriesQueryViewModel;
  onQueryChange: (next: LibrarySeriesQueryViewModel) => void;
}

/**
 * SeriesToolbar - All Series tab list controls (search, sort)
 */
export const SeriesToolbar = ({ query, onQueryChange }: SeriesToolbarProps) => {
  const { t } = useT();
  const [searchValue, setSearchValue] = useState(query.q || "");
  const debouncedSearchValue = useDebouncedValue(searchValue, 300);

  // Sync search value when query changes externally (e.g., tab switch, browser back)
  useEffect(() => {
    setSearchValue(query.q || "");
  }, [query.q]);

  // Update query when debounced search value changes
  useEffect(() => {
    const trimmed = debouncedSearchValue.trim();
    if (trimmed !== (query.q || "")) {
      onQueryChange({ ...query, q: trimmed || undefined, page: 1 });
    }
  }, [debouncedSearchValue, onQueryChange, query]);

  const handleSearchChange = (value: string) => {
    // Validate length
    if (value.length > 50) {
      return;
    }
    setSearchValue(value);
  };

  const handleSortChange = (sort: string) => {
    onQueryChange({
      ...query,
      sort: sort as LibrarySeriesQueryViewModel["sort"],
      page: 1,
    });
  };

  const handleOrderToggle = () => {
    onQueryChange({
      ...query,
      order: query.order === "asc" ? "desc" : "asc",
      page: 1,
    });
  };

  return (
    <div className="flex flex-wrap gap-4">
      {/* Search */}
      <div className="flex-1 min-w-[200px]">
        <Input
          type="search"
          placeholder={t("library.searchSeries")}
          value={searchValue}
          onChange={(e) => handleSearchChange(e.target.value)}
          maxLength={50}
        />
      </div>

      {/* Sort */}
      <Select value={query.sort} onValueChange={handleSortChange}>
        <SelectTrigger className="w-[140px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="updated_at">{t("library.filters.sortUpdated")}</SelectItem>
          <SelectItem value="created_at">{t("library.filters.sortCreated")}</SelectItem>
          <SelectItem value="title">{t("library.filters.sortTitle")}</SelectItem>
        </SelectContent>
      </Select>

      {/* Order toggle */}
      <Button
        variant="outline"
        size="icon"
        onClick={handleOrderToggle}
        aria-label={t("library.filters.sortOrderAria", {
          direction: query.order === "asc" ? t("library.filters.sortAsc") : t("library.filters.sortDesc"),
        })}
      >
        {query.order === "asc" ? "↑" : "↓"}
      </Button>
    </div>
  );
};
