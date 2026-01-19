import { z } from "zod";

export const AcceptInviteSchema = z.object({
  token: z.string().trim().min(20),
  uid: z.string().trim().min(1)
});

export type AcceptInviteInput = z.infer<typeof AcceptInviteSchema>;
