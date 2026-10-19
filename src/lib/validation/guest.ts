import { z } from 'zod';

export const GUEST_NAME_MAX = 80;
export const GUEST_GROUP_MAX = 40;
export const GUEST_SEATS_MAX = 20;

export const guestInputSchema = z.object({
  displayName: z.string().trim().min(1).max(GUEST_NAME_MAX),
  maxSeats: z.number().int().min(1).max(GUEST_SEATS_MAX),
  group: z.string().trim().max(GUEST_GROUP_MAX),
});

export type GuestInput = z.infer<typeof guestInputSchema>;
