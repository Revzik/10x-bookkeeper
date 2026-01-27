/**
 * Example unit test for Zod validation schemas
 * Demonstrates testing pure logic with Vitest
 */

import { describe, it, expect } from "vitest";
import { paginationPageSchema, paginationSizeSchema, paginationOrderSchema, searchQuerySchema } from "./shared.schemas";

describe("paginationPageSchema", () => {
  it("should parse valid page numbers", () => {
    expect(paginationPageSchema.parse("1")).toBe(1);
    expect(paginationPageSchema.parse("10")).toBe(10);
    expect(paginationPageSchema.parse("999")).toBe(999);
  });

  it("should default to 1 when undefined", () => {
    expect(paginationPageSchema.parse(undefined)).toBe(1);
  });

  it("should reject page numbers less than 1", () => {
    expect(() => paginationPageSchema.parse("0")).toThrow("Page must be at least 1");
    expect(() => paginationPageSchema.parse("-1")).toThrow("Page must be at least 1");
  });

  it("should reject invalid strings", () => {
    expect(() => paginationPageSchema.parse("abc")).toThrow();
  });
});

describe("paginationSizeSchema", () => {
  it("should parse valid sizes", () => {
    expect(paginationSizeSchema.parse("1")).toBe(1);
    expect(paginationSizeSchema.parse("50")).toBe(50);
    expect(paginationSizeSchema.parse("100")).toBe(100);
  });

  it("should default to 10 when undefined", () => {
    expect(paginationSizeSchema.parse(undefined)).toBe(10);
  });

  it("should reject sizes less than 1", () => {
    expect(() => paginationSizeSchema.parse("0")).toThrow("Size must be at least 1");
  });

  it("should reject sizes greater than 100", () => {
    expect(() => paginationSizeSchema.parse("101")).toThrow("Size cannot exceed 100");
    expect(() => paginationSizeSchema.parse("1000")).toThrow("Size cannot exceed 100");
  });
});

describe("paginationOrderSchema", () => {
  it("should parse valid order values", () => {
    expect(paginationOrderSchema.parse("asc")).toBe("asc");
    expect(paginationOrderSchema.parse("desc")).toBe("desc");
  });

  it("should default to desc when undefined", () => {
    expect(paginationOrderSchema.parse(undefined)).toBe("desc");
  });

  it("should reject invalid order values", () => {
    expect(() => paginationOrderSchema.parse("invalid" as any)).toThrow();
  });
});

describe("searchQuerySchema", () => {
  it("should trim whitespace", () => {
    expect(searchQuerySchema.parse("  test  ")).toBe("test");
    expect(searchQuerySchema.parse(" hello world ")).toBe("hello world");
  });

  it("should allow undefined and empty strings", () => {
    expect(searchQuerySchema.parse(undefined)).toBeUndefined();
    expect(searchQuerySchema.parse("")).toBe("");
  });

  it("should accept valid search queries", () => {
    expect(searchQuerySchema.parse("test")).toBe("test");
    expect(searchQuerySchema.parse("a".repeat(50))).toBe("a".repeat(50));
  });

  it("should reject queries exceeding 50 characters", () => {
    expect(() => searchQuerySchema.parse("a".repeat(51))).toThrow("Search query cannot exceed 50 characters");
  });
});
