/**
 * Test utilities for component testing
 * Custom render function with common providers and utilities
 */

import { render as rtlRender, type RenderOptions } from "@testing-library/react";
import { type ReactElement, type ReactNode } from "react";

/**
 * Custom render function that wraps components with necessary providers
 * Add providers here as needed (e.g., theme providers, query clients, etc.)
 */
function customRender(ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) {
  const Wrapper = ({ children }: { children: ReactNode }) => {
    // Add providers here
    // Example: <ThemeProvider><QueryClientProvider>{children}</QueryClientProvider></ThemeProvider>
    return <>{children}</>;
  };

  return rtlRender(ui, { wrapper: Wrapper, ...options });
}

// Re-export everything from React Testing Library
export * from "@testing-library/react";
export { default as userEvent } from "@testing-library/user-event";

// Override render method with custom implementation
export { customRender as render };
