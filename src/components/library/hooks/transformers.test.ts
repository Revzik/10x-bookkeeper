import { describe, it, expect, vi } from "vitest";
import type { BookListItemDto, SeriesListItemDto } from "@/types";
import { transformBookListItem, transformSeriesListItem, transformSeriesOption } from "./transformers";

// Mock the formatRelativeTime utility
vi.mock("@/lib/utils", () => ({
  formatRelativeTime: vi.fn((isoString: string) => `mocked: ${isoString}`),
}));

describe("transformers", () => {
  describe("transformBookListItem", () => {
    it("should transform basic book DTO to view model", () => {
      // Arrange
      const dto: BookListItemDto = {
        id: "book-123",
        title: "The Great Gatsby",
        author: "F. Scott Fitzgerald",
        status: "reading",
        total_pages: 180,
        current_page: 90,
        series_id: "series-456",
        series_order: 2,
        updated_at: "2024-01-15T10:30:00Z",
      };

      // Act
      const result = transformBookListItem(dto);

      // Assert
      expect(result).toEqual({
        id: "book-123",
        title: "The Great Gatsby",
        author: "F. Scott Fitzgerald",
        status: "reading",
        progressLabel: "90 / 180",
        progressPercent: 50,
        updatedAtIso: "2024-01-15T10:30:00Z",
        updatedAtLabel: "mocked: 2024-01-15T10:30:00Z",
        seriesId: "series-456",
        seriesOrder: 2,
      });
    });

    it("should calculate 0% progress when current_page is 0", () => {
      // Arrange
      const dto: BookListItemDto = {
        id: "book-123",
        title: "Test Book",
        author: "Test Author",
        status: "want_to_read",
        total_pages: 300,
        current_page: 0,
        series_id: null,
        series_order: null,
        updated_at: "2024-01-15T10:30:00Z",
      };

      // Act
      const result = transformBookListItem(dto);

      // Assert
      expect(result.progressPercent).toBe(0);
      expect(result.progressLabel).toBe("0 / 300");
    });

    it("should calculate 100% progress when current_page equals total_pages", () => {
      // Arrange
      const dto: BookListItemDto = {
        id: "book-123",
        title: "Test Book",
        author: "Test Author",
        status: "completed",
        total_pages: 250,
        current_page: 250,
        series_id: null,
        series_order: null,
        updated_at: "2024-01-15T10:30:00Z",
      };

      // Act
      const result = transformBookListItem(dto);

      // Assert
      expect(result.progressPercent).toBe(100);
      expect(result.progressLabel).toBe("250 / 250");
    });

    it("should handle 0 total_pages safely (edge case for division by zero)", () => {
      // Arrange
      const dto: BookListItemDto = {
        id: "book-123",
        title: "Test Book",
        author: "Test Author",
        status: "want_to_read",
        total_pages: 0,
        current_page: 0,
        series_id: null,
        series_order: null,
        updated_at: "2024-01-15T10:30:00Z",
      };

      // Act
      const result = transformBookListItem(dto);

      // Assert
      expect(result.progressPercent).toBe(0);
      expect(result.progressLabel).toBe("0 / 0");
    });

    it("should round progress percentage to nearest integer", () => {
      // Arrange
      const dto: BookListItemDto = {
        id: "book-123",
        title: "Test Book",
        author: "Test Author",
        status: "reading",
        total_pages: 300,
        current_page: 100,
        series_id: null,
        series_order: null,
        updated_at: "2024-01-15T10:30:00Z",
      };

      // Act
      const result = transformBookListItem(dto);

      // Assert
      expect(result.progressPercent).toBe(33); // 100/300 = 0.333... -> 33%
    });

    it("should handle fractional progress correctly with rounding", () => {
      // Arrange
      const dto: BookListItemDto = {
        id: "book-123",
        title: "Test Book",
        author: "Test Author",
        status: "reading",
        total_pages: 300,
        current_page: 200,
        series_id: null,
        series_order: null,
        updated_at: "2024-01-15T10:30:00Z",
      };

      // Act
      const result = transformBookListItem(dto);

      // Assert
      expect(result.progressPercent).toBe(67); // 200/300 = 0.666... -> 67%
    });

    it("should preserve null series_id and series_order", () => {
      // Arrange
      const dto: BookListItemDto = {
        id: "book-123",
        title: "Standalone Book",
        author: "Test Author",
        status: "reading",
        total_pages: 200,
        current_page: 50,
        series_id: null,
        series_order: null,
        updated_at: "2024-01-15T10:30:00Z",
      };

      // Act
      const result = transformBookListItem(dto);

      // Assert
      expect(result.seriesId).toBeNull();
      expect(result.seriesOrder).toBeNull();
    });

    it("should preserve ISO timestamp and format relative time label", () => {
      // Arrange
      const dto: BookListItemDto = {
        id: "book-123",
        title: "Test Book",
        author: "Test Author",
        status: "reading",
        total_pages: 200,
        current_page: 50,
        series_id: null,
        series_order: null,
        updated_at: "2024-01-15T10:30:00Z",
      };

      // Act
      const result = transformBookListItem(dto);

      // Assert
      expect(result.updatedAtIso).toBe("2024-01-15T10:30:00Z");
      expect(result.updatedAtLabel).toBe("mocked: 2024-01-15T10:30:00Z");
    });

    it("should handle all book statuses", () => {
      // Arrange
      const statuses: ("want_to_read" | "reading" | "completed")[] = ["want_to_read", "reading", "completed"];

      statuses.forEach((status) => {
        const dto: BookListItemDto = {
          id: "book-123",
          title: "Test Book",
          author: "Test Author",
          status,
          total_pages: 200,
          current_page: 50,
          series_id: null,
          series_order: null,
          updated_at: "2024-01-15T10:30:00Z",
        };

        // Act
        const result = transformBookListItem(dto);

        // Assert
        expect(result.status).toBe(status);
      });
    });
  });

  describe("transformSeriesListItem", () => {
    it("should transform basic series DTO to view model", () => {
      // Arrange
      const dto: SeriesListItemDto = {
        id: "series-123",
        title: "Harry Potter",
        created_at: "2024-01-10T08:00:00Z",
        updated_at: "2024-01-15T10:30:00Z",
      };

      // Act
      const result = transformSeriesListItem(dto, 7);

      // Assert
      expect(result).toEqual({
        id: "series-123",
        title: "Harry Potter",
        bookCount: 7,
        createdAtIso: "2024-01-10T08:00:00Z",
        createdAtLabel: "mocked: 2024-01-10T08:00:00Z",
        updatedAtIso: "2024-01-15T10:30:00Z",
        updatedAtLabel: "mocked: 2024-01-15T10:30:00Z",
      });
    });

    it("should handle series with zero books", () => {
      // Arrange
      const dto: SeriesListItemDto = {
        id: "series-123",
        title: "Empty Series",
        created_at: "2024-01-10T08:00:00Z",
        updated_at: "2024-01-15T10:30:00Z",
      };

      // Act
      const result = transformSeriesListItem(dto, 0);

      // Assert
      expect(result.bookCount).toBe(0);
    });

    it("should preserve both created and updated timestamps with labels", () => {
      // Arrange
      const dto: SeriesListItemDto = {
        id: "series-123",
        title: "Test Series",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-20T12:00:00Z",
      };

      // Act
      const result = transformSeriesListItem(dto, 5);

      // Assert
      expect(result.createdAtIso).toBe("2024-01-01T00:00:00Z");
      expect(result.createdAtLabel).toBe("mocked: 2024-01-01T00:00:00Z");
      expect(result.updatedAtIso).toBe("2024-01-20T12:00:00Z");
      expect(result.updatedAtLabel).toBe("mocked: 2024-01-20T12:00:00Z");
    });

    it("should handle series with large book counts", () => {
      // Arrange
      const dto: SeriesListItemDto = {
        id: "series-123",
        title: "Long Series",
        created_at: "2024-01-10T08:00:00Z",
        updated_at: "2024-01-15T10:30:00Z",
      };

      // Act
      const result = transformSeriesListItem(dto, 999);

      // Assert
      expect(result.bookCount).toBe(999);
    });
  });

  describe("transformSeriesOption", () => {
    it("should transform series DTO to select option view model", () => {
      // Arrange
      const dto: SeriesListItemDto = {
        id: "series-123",
        title: "The Lord of the Rings",
        created_at: "2024-01-10T08:00:00Z",
        updated_at: "2024-01-15T10:30:00Z",
      };

      // Act
      const result = transformSeriesOption(dto);

      // Assert
      expect(result).toEqual({
        value: "series-123",
        label: "The Lord of the Rings",
      });
    });

    it("should only include value and label fields (minimal structure)", () => {
      // Arrange
      const dto: SeriesListItemDto = {
        id: "series-456",
        title: "Foundation",
        created_at: "2024-01-10T08:00:00Z",
        updated_at: "2024-01-15T10:30:00Z",
      };

      // Act
      const result = transformSeriesOption(dto);

      // Assert
      expect(Object.keys(result)).toEqual(["value", "label"]);
      expect(result.value).toBe("series-456");
      expect(result.label).toBe("Foundation");
    });

    it("should work with series having various book counts", () => {
      // Arrange - book_count shouldn't affect the transformation
      const dto: SeriesListItemDto = {
        id: "series-789",
        title: "Discworld",
        created_at: "2024-01-10T08:00:00Z",
        updated_at: "2024-01-15T10:30:00Z",
      };

      // Act
      const result = transformSeriesOption(dto);

      // Assert
      expect(result).toEqual({
        value: "series-789",
        label: "Discworld",
      });
    });

    it("should handle series with special characters in title", () => {
      // Arrange
      const dto: SeriesListItemDto = {
        id: "series-999",
        title: "A Song of Ice & Fire: The Chronicles",
        created_at: "2024-01-10T08:00:00Z",
        updated_at: "2024-01-15T10:30:00Z",
      };

      // Act
      const result = transformSeriesOption(dto);

      // Assert
      expect(result).toEqual({
        value: "series-999",
        label: "A Song of Ice & Fire: The Chronicles",
      });
    });
  });

  describe("integration scenarios", () => {
    it("should transform multiple books consistently", () => {
      // Arrange
      const dtos: BookListItemDto[] = [
        {
          id: "book-1",
          title: "Book 1",
          author: "Author 1",
          status: "reading",
          total_pages: 200,
          current_page: 100,
          series_id: "series-1",
          series_order: 1,
          updated_at: "2024-01-15T10:30:00Z",
        },
        {
          id: "book-2",
          title: "Book 2",
          author: "Author 2",
          status: "completed",
          total_pages: 300,
          current_page: 300,
          series_id: "series-1",
          series_order: 2,
          updated_at: "2024-01-16T10:30:00Z",
        },
      ];

      // Act
      const results = dtos.map(transformBookListItem);

      // Assert
      expect(results).toHaveLength(2);
      expect(results[0].progressPercent).toBe(50);
      expect(results[1].progressPercent).toBe(100);
      expect(results[0].seriesId).toBe("series-1");
      expect(results[1].seriesId).toBe("series-1");
    });

    it("should transform multiple series consistently", () => {
      // Arrange
      const dtos: SeriesListItemDto[] = [
        {
          id: "series-1",
          title: "Series 1",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-15T10:30:00Z",
        },
        {
          id: "series-2",
          title: "Series 2",
          created_at: "2024-01-05T00:00:00Z",
          updated_at: "2024-01-20T10:30:00Z",
        },
      ];

      // Act
      const bookCounts = [3, 5];
      const viewModels = dtos.map((dto, index) => transformSeriesListItem(dto, bookCounts[index]));
      const options = dtos.map(transformSeriesOption);

      // Assert
      expect(viewModels).toHaveLength(2);
      expect(options).toHaveLength(2);
      expect(viewModels[0].bookCount).toBe(3);
      expect(viewModels[1].bookCount).toBe(5);
      expect(options[0].value).toBe("series-1");
      expect(options[1].value).toBe("series-2");
    });
  });
});
