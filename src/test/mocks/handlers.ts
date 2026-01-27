/**
 * MSW request handlers for mocking API endpoints in tests
 * See: https://mswjs.io/docs/basics/response-resolver
 */

import { http, HttpResponse } from "msw";

// Base URL for API endpoints
const API_BASE = "/api/v1";

export const handlers = [
  // Auth endpoints
  http.post(`${API_BASE}/auth/login`, () => {
    return HttpResponse.json({
      user: {
        id: "test-user-id",
        email: "test@example.com",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    });
  }),

  http.post(`${API_BASE}/auth/signup`, () => {
    return HttpResponse.json({
      user: {
        id: "test-user-id",
        email: "test@example.com",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    });
  }),

  http.post(`${API_BASE}/auth/logout`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // Series endpoints
  http.get(`${API_BASE}/series`, () => {
    return HttpResponse.json({
      data: [
        {
          id: "series-1",
          user_id: "test-user-id",
          title: "Test Series",
          description: "Test series description",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      meta: {
        page: 1,
        page_size: 10,
        total_items: 1,
        total_pages: 1,
      },
    });
  }),

  // Books endpoints
  http.get(`${API_BASE}/books`, () => {
    return HttpResponse.json({
      data: [
        {
          id: "book-1",
          user_id: "test-user-id",
          title: "Test Book",
          author: "Test Author",
          series_id: null,
          status: "reading",
          current_page: 50,
          total_pages: 100,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      meta: {
        page: 1,
        page_size: 10,
        total_items: 1,
        total_pages: 1,
      },
    });
  }),
];
