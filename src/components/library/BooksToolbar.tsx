import { useState, useEffect } from "react";
import type { LibraryBooksQueryViewModel, BookStatus, SeriesSelectOptionViewModel } from "@/types";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ChevronUp, ChevronDown } from "lucide-react";
import { useDebouncedValue } from "./hooks";

interface BooksToolbarProps {
  query: LibraryBooksQueryViewModel;
  seriesOptions: SeriesSelectOptionViewModel[];
  onQueryChange: (next: LibraryBooksQueryViewModel) => void;
}

/**
 * BooksToolbar - All Books tab list controls (search, filters, sort)
 */
export const BooksToolbar = ({ query, seriesOptions, onQueryChange }: BooksToolbarProps) => {
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

  const handleStatusChange = (status: string) => {
    onQueryChange({
      ...query,
      status: status === "all" ? undefined : (status as BookStatus),
      page: 1,
    });
  };

  const handleSeriesChange = (seriesId: string) => {
    onQueryChange({
      ...query,
      series_id: seriesId === "all" ? undefined : seriesId,
      page: 1,
    });
  };

  const handleSortChange = (sort: string) => {
    onQueryChange({
      ...query,
      sort: sort as LibraryBooksQueryViewModel["sort"],
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
          placeholder="Search books..."
          value={searchValue}
          onChange={(e) => handleSearchChange(e.target.value)}
          maxLength={50}
          data-testid="input-books-search"
        />
      </div>

      {/* Status filter */}
      <Select value={query.status || "all"} onValueChange={handleStatusChange}>
        <SelectTrigger className="w-[180px]" data-testid="select-books-status-filter">
          <SelectValue placeholder="All Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all" data-testid="option-status-all">
            All Status
          </SelectItem>
          <SelectItem value="want_to_read" data-testid="option-status-want-to-read">
            Want to Read
          </SelectItem>
          <SelectItem value="reading" data-testid="option-status-reading">
            Reading
          </SelectItem>
          <SelectItem value="completed" data-testid="option-status-completed">
            Completed
          </SelectItem>
        </SelectContent>
      </Select>

      {/* Series filter */}
      <Select value={query.series_id || "all"} onValueChange={handleSeriesChange}>
        <SelectTrigger className="w-[180px]" data-testid="select-books-series-filter">
          <SelectValue placeholder="All Series" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all" data-testid="option-series-all">
            All Series
          </SelectItem>
          {seriesOptions.map((option) => (
            <SelectItem key={option.value} value={option.value} data-testid={`option-series-${option.value}`}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Sort */}
      <Select value={query.sort} onValueChange={handleSortChange}>
        <SelectTrigger className="w-[140px]" data-testid="select-books-sort">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="updated_at" data-testid="option-sort-updated">
            Updated
          </SelectItem>
          <SelectItem value="created_at" data-testid="option-sort-created">
            Created
          </SelectItem>
          <SelectItem value="title" data-testid="option-sort-title">
            Title
          </SelectItem>
          <SelectItem value="author" data-testid="option-sort-author">
            Author
          </SelectItem>
          <SelectItem value="status" data-testid="option-sort-status">
            Status
          </SelectItem>
        </SelectContent>
      </Select>

      {/* Order toggle */}
      <Button
        variant="outline"
        size="icon"
        onClick={handleOrderToggle}
        aria-label={`Sort ${query.order === "asc" ? "ascending" : "descending"}`}
        data-testid="btn-books-sort-order"
      >
        {query.order === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </Button>
    </div>
  );
};
