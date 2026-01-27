/**
 * MSW server setup for Node environment (Vitest)
 * See: https://mswjs.io/docs/integrations/node
 */

import { setupServer } from "msw/node";
import { handlers } from "./handlers";

// This configures a request mocking server with the given request handlers
export const server = setupServer(...handlers);
