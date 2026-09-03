import { Licence, Privacy } from "@repo/types";
import { z } from "zod";

export const CreateEventSchema = z.object({
    title: z
        .string()
        .min(2, "Title must be at least 2 characters long")
        .max(100, "Title must be less than 100 characters")
        .trim(),

    privacy: z.enum([
        Privacy.PUBLIC,
        Privacy.PRIVATE,
    ]).default(Privacy.PUBLIC),

    licence: z.enum([
        Licence.FREE,
        Licence.INVITE_ONLY,
        Licence.GEOTIME
    ]).default(Licence.FREE),

    // Geo Time fields (optional by default, required when licence is GEOTIME)
    latitude: z
        .string()
        .optional()
        .transform((val) => val === "" ? undefined : val)
        .refine(
            (val) => val === undefined || /^-?\d*\.?\d+$/.test(val),
            "Must be a valid number"
        )
        .transform((val) => val ? parseFloat(val) : undefined)
        .pipe(
            z.number()
                .min(-90, "Latitude must be between -90 and 90")
                .max(90, "Latitude must be between -90 and 90")
                .optional()
        ),

    longitude: z
        .string()
        .optional()
        .transform((val) => val === "" ? undefined : val)
        .refine(
            (val) => val === undefined || /^-?\d*\.?\d+$/.test(val),
            "Must be a valid number"
        )
        .transform((val) => val ? parseFloat(val) : undefined)
        .pipe(
            z.number()
                .min(-180, "Longitude must be between -180 and 180")
                .max(180, "Longitude must be between -180 and 180")
                .optional()
        ),

    radius: z
        .string()
        .optional()
        .transform((val) => val === "" ? undefined : val)
        .refine(
            (val) => val === undefined || /^\d+$/.test(val),
            "Radius must be a positive number"
        )
        .transform((val) => val ? parseInt(val, 10) : undefined)
        .pipe(
            z.number()
                .min(1, "Radius must be at least 1 meter")
                .max(10000, "Radius must be less than 10,000 meters")
                .optional()
        ),

    // New datetime fields
    geoVotingStart: z
        .date()
        .optional()
        .refine(
            (val) => {
                if (!val) return true;
                const now = new Date();
                const fiveMinutesLater = new Date(now.getTime() + 5 * 60 * 1000);
                return val >= fiveMinutesLater;
            },
            "Start time must be at least 5 minutes from now"
        ),

    geoVotingEnd: z
        .date()
        .optional()
        .refine(
            (val) => {
                if (!val) return true;
                const now = new Date();
                const fiveMinutesLater = new Date(now.getTime() + 5 * 60 * 1000);
                return val >= fiveMinutesLater;
            },
            "End time must be at least 5 minutes from now"
        ),
}).refine(
    // Geo fields are required when licence is GEOTIME
    (data) => {
        if (data.licence === Licence.GEOTIME) {
            return data.latitude !== undefined &&
                data.longitude !== undefined &&
                data.radius !== undefined;
        }
        return true;
    },
    {
        message: "Latitude, longitude, and radius are required when licence is Geo Time",
        path: ["latitude"],
    }
).refine(
    // Start time is required when licence is GEOTIME
    (data) => {
        if (data.licence === Licence.GEOTIME) {
            return data.geoVotingStart !== undefined;
        }
        return true;
    },
    {
        message: "Start time is required when licence is Geo Time",
        path: ["geoVotingStart"],
    }
).refine(
    // End time must be after start time
    (data) => {
        if (data.licence === Licence.GEOTIME && data.geoVotingStart && data.geoVotingEnd) {
            return data.geoVotingEnd > data.geoVotingStart;
        }
        return true;
    },
    {
        message: "End time must be after start time",
        path: ["endTime"],
    }
).refine(
    // Both start and end must be at least 5 minutes from now
    (data) => {
        if (data.licence === Licence.GEOTIME) {
            const now = new Date();
            const fiveMinutesLater = new Date(now.getTime() + 5 * 60 * 1000);

            if (data.geoVotingStart && data.geoVotingStart < fiveMinutesLater) {
                return false;
            }
            if (data.geoVotingEnd && data.geoVotingEnd < fiveMinutesLater) {
                return false;
            }
        }
        return true;
    },
    {
        message: "Both start and end times must be at least 5 minutes from now",
        path: ["startTime"],
    }
);

export type CreateEventData = z.infer<typeof CreateEventSchema>;