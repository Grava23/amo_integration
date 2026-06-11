import { z } from "zod"

export const completeOauthQuerySchema = z.object({
  state: z.string().optional(),
  code: z.string().optional(),
  referer: z.string().optional().default(""),
  error: z.string().optional(),
})

export type CompleteOauthQuery = z.infer<typeof completeOauthQuerySchema>