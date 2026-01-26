import { z } from "zod";

/**
 * Example schemas for OpenRouter structured outputs
 *
 * These schemas demonstrate the format required for both JSON Schema (for OpenRouter)
 * and Zod (for runtime validation).
 */

// ==================== Q&A with Citations ====================

/**
 * Citation structure for answer attribution
 */
export const citationSchema = z.object({
  noteId: z.string(),
  quote: z.string(),
});

/**
 * Answer with citations response schema (Zod)
 */
export const answerWithCitationsZodSchema = z.object({
  answer: z.string(),
  citations: z.array(citationSchema),
});

/**
 * Answer with citations response schema (JSON Schema for OpenRouter)
 *
 * This schema is used with response_format to ensure the model returns
 * structured JSON that matches the expected format.
 */
export const answerWithCitationsJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    answer: {
      type: "string",
      description: "The answer to the user's question based on the provided context",
    },
    citations: {
      type: "array",
      description: "List of citations from the source material that support the answer",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          noteId: {
            type: "string",
            description: "The ID of the note being cited",
          },
          quote: {
            type: "string",
            description: "The exact quote from the note that supports the answer",
          },
        },
        required: ["noteId", "quote"],
      },
    },
  },
  required: ["answer", "citations"],
};

/**
 * TypeScript type for answer with citations (inferred from Zod schema)
 */
export type AnswerWithCitations = z.infer<typeof answerWithCitationsZodSchema>;

// ==================== AI Query Answer ====================

/**
 * AI answer response schema (Zod)
 * Matches AiAnswerDto from types.ts
 */
export const aiAnswerZodSchema = z.object({
  text: z.string(),
  low_confidence: z.boolean(),
});

/**
 * AI answer response schema (JSON Schema for OpenRouter)
 *
 * This schema ensures the model returns structured JSON that matches
 * the expected AiAnswerDto format from the API.
 */
export const aiAnswerJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    text: {
      type: "string",
      description: "The answer to the user's question based on the provided notes context",
    },
    low_confidence: {
      type: "boolean",
      description:
        "Indicates whether the AI has low confidence in the answer (true if the answer is uncertain or information is insufficient)",
    },
  },
  required: ["text", "low_confidence"],
};

/**
 * TypeScript type for AI answer (inferred from Zod schema)
 */
export type AiAnswer = z.infer<typeof aiAnswerZodSchema>;
