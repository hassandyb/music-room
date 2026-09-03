"use client";

import { Input } from "@/components/ui/input";
import useDebounce from "@/hooks/use-debounce";
import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function EventSearch() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [value, setValue] = useState(searchParams.get("search") ?? "");
    const debouncedValue = useDebounce(value, 400);

    useEffect(() => {
        const current = searchParams.get("search") ?? "";
        if (debouncedValue === current) return;

        const params = new URLSearchParams(searchParams.toString());
        if (debouncedValue) {
            params.set("search", debouncedValue);
        } else {
            params.delete("search");
        }
        params.set("page", "1");
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedValue]);

    return (
        <div className="relative">
            <Input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Search events..."
                className="w-64 border-white/10 bg-white/5 pl-9 text-sm placeholder:text-muted-foreground focus:border-[#ff4d00]/50 focus:ring-[#ff4d00]/20"
            />
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>
    );
}
