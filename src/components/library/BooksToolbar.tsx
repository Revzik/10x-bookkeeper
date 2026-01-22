import { useState, useEffect } from "react";
import type { LibraryBooksQueryViewModel, BookStatus, SeriesSelectOptionViewModel } from "@/types";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface BooksToolbarProps {
  query: LibraryBooksQueryViewModel;
  seriesOptions: SeriesSelectOptionViewModel[];
  onQueryChange: (next: LibraryBooksQueryViewModel) => void;
}

/**
 * BooksToolbar - All Books tab list controls (search, filters, sort)
 *
 * TODO: Implement debounced search
 */
export const BooksToolbar = ({ query, seriesOptions, onQueryChange }: BooksToolbarProps) => {
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
        />
      </div>

      {/* Status filter */}
      <Select value={query.status || "all"} onValueChange={handleStatusChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="All Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="want_to_read">Want to Read</SelectItem>
          <SelectItem value="reading">Reading</SelectItem>
          <SelectItem value="completed">Completed</SelectItem>
        </SelectContent>
      </Select>

      {/* Series filter */}
      <Select value={query.series_id || "all"} onValueChange={handleSeriesChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="All Series" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Series</SelectItem>
          {seriesOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Sort */}
      <Select value={query.sort} onValueChange={handleSortChange}>
        <SelectTrigger className="w-[140px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="updated_at">Updated</SelectItem>
          <SelectItem value="created_at">Created</SelectItem>
          <SelectItem value="title">Title</SelectItem>
          <SelectItem value="author">Author</SelectItem>
          <SelectItem value="status">Status</SelectItem>
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
