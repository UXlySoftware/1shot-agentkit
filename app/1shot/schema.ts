import { z } from "zod";

export const SearchPromptsActionSchema = z.object({
  query: z.string(),
});
