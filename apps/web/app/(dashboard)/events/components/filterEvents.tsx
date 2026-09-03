"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { EventStatus, Licence, Privacy } from "@repo/types";
import {
    Clock,
    Globe,
    MapPin,
    Sparkles,
    X,
    Lock,
    Users,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const statusOptions = [
    { value: EventStatus.PLAYING, label: "Playing", icon: Sparkles },
    { value: EventStatus.CREATED, label: "Open", icon: Clock },
    { value: EventStatus.FINISHED, label: "Finished", icon: X },
];

const privacyOptions = [
    { value: Privacy.PUBLIC, label: "Public", icon: Globe },
    { value: Privacy.PRIVATE, label: "Private", icon: Lock },
];


export default function EventsFilter() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const status = searchParams.getAll("status");
    const privacy = searchParams.getAll("privacy");
    const licence = searchParams.getAll("licence");
    const hasGeoVoting = searchParams.get("hasGeoVoting") === "true";

    const updateParams = (mutate: (params: URLSearchParams) => void) => {
        const params = new URLSearchParams(searchParams.toString());
        mutate(params);
        params.set("page", "1");
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
    };

    const toggleArrayValue = (key: "status" | "privacy" | "licence", value: string) => {
        updateParams((params) => {
            const current = params.getAll(key);
            params.delete(key);
            const next = current.includes(value)
                ? current.filter((v) => v !== value)
                : [...current, value];
            next.forEach((v) => params.append(key, v));
        });
    };

    const toggleGeoVoting = () => {
        updateParams((params) => {
            if (hasGeoVoting) {
                params.delete("hasGeoVoting");
            } else {
                params.set("hasGeoVoting", "true");
            }
        });
    };

    const activeFilterCount =
        status.length + privacy.length + licence.length + (hasGeoVoting ? 1 : 0);

    const clearFilters = () => {
        updateParams((params) => {
            params.delete("status");
            params.delete("privacy");
            params.delete("licence");
            params.delete("hasGeoVoting");
        });
    };

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                    {statusOptions.map((option) => (
                        <button
                            key={option.value}
                            onClick={() => toggleArrayValue("status", option.value)}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200",
                                status.includes(option.value)
                                    ? "bg-[#ff4d00] text-white"
                                    : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/70 border border-white/5"
                            )}
                        >
                            <option.icon className="h-3 w-3" />
                            {option.label}
                        </button>
                    ))}
                    {privacyOptions.map((option) => (
                        <button
                            key={option.value}
                            onClick={() => toggleArrayValue("privacy", option.value)}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200",
                                privacy.includes(option.value)
                                    ? "bg-[#ff4d00] text-white"
                                    : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/70 border border-white/5"
                            )}
                        >
                            <option.icon className="h-3 w-3" />
                            {option.label}
                        </button>
                    ))}
                </div>

                {activeFilterCount > 0 && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearFilters}
                        className="h-7 gap-1.5 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                    >
                        <X className="h-3 w-3" />
                        Clear {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""}
                    </Button>
                )}
            </div>
        </div>
    );
}
