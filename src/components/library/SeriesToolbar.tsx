import { useState, useEffect } from "react";
import type { LibrarySeriesQueryViewModel } from "@/types";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface SeriesToolbarProps {
  query: LibrarySeriesQueryViewModel;
  onQueryChange: (next: LibrarySeriesQueryViewModel) => void;
}

/**
 * SeriesToolbar - All Series tab list controls (search, sort)
 *
 * TODO: Implement debounced search
 */
export const SeriesToolbar = ({ query, onQueryChange }: SeriesToolbarProps) => {
  const [searchValue, setSearchValue] = useState(query.q || "");

  useEffect(() => {
    setSearchValue(query.q || "");
  }, [query.q]);

  const handleSearchChange = (value: string) => {
    setSearchValue(value);

    // Validate length
    if (value.trim().length > 50) {
      return;
    }

    // TODO: Implement debounce
    onQueryChange({ ...query, q: value.trim() || undefined, page: 1 });
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
          placeholder="Search series..."
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
          <SelectItem value="updated_at">Updated</SelectItem>
          <SelectItem value="created_at">Created</SelectItem>
          <SelectItem value="title">Title</SelectItem>
        </SelectContent>
      </Select>

      {/* Order toggle */}
      <Button
        variant="outline"
        size="icon"
        onClick={handleOrderToggle}
        aria-label={`Sort ${query.order === "asc" ? "ascending" : "descending"}`}
      >
        {query.order === "asc" ? "↑" : "↓"}
      </Button>
    </div>
  );
};
