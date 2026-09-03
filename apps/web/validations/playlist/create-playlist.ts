import { PlaylistVisibility } from "@repo/types";
import { z } from "zod";

export const CreatePlaylistSchema = z.object({
    name: z
        .string()
        .min(1, "Name is required")
        .max(100, "Name must be less than 100 characters")
        .trim(),

    description: z
        .string()
        .max(1000, "Description must be less than 1000 characters")
        .optional(),

    visibility: z
        .enum([PlaylistVisibility.PUBLIC, PlaylistVisibility.PRIVATE])
        .default(PlaylistVisibility.PUBLIC),
});

export type CreatePlaylistData = z.infer<typeof CreatePlaylistSchema>;
