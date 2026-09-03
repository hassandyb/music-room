"use client"

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, MapPin } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CreateEventData, CreateEventSchema } from "@/validations/event/create-event";
import { useCreateEventMutation } from "@/services/eventApi";
import { toast } from "sonner";
import { errorMessage } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Licence, Privacy } from "@repo/types";
import { DateTimePicker } from "@/components/ui/dateTime";

export function CreateEvent() {
    const [open, setOpen] = useState(false);
    const [createEvent, { isLoading }] = useCreateEventMutation()
    const router = useRouter();


    const { register, handleSubmit, formState: { errors, isSubmitting }, watch, setValue } = useForm(
        { resolver: zodResolver(CreateEventSchema) }
    )


    React.useEffect(() => {
        if (open && watch("licence") === Licence.GEOTIME) {
            detectLocation();
        }
    }, [open, watch("licence")]);


    const detectLocation = () => {
        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser");
            return;
        }


        navigator.geolocation.getCurrentPosition(
            (position) => {

                // add value to the form
                const lat = position.coords.latitude.toString();
                const lng = position.coords.longitude.toString();

                setValue("latitude", lat);
                setValue("longitude", lng);
            },
            (error) => {
            },
            {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0,
            }
        );
    };

    const onSubmit = async (data: CreateEventData) => {
        try {
            console.log(data)
            await createEvent(data).unwrap();
            toast.success("Event created!", {
                description: "Your event has been created successfully.",
            });
            router.refresh();
            setTimeout(() => {
                setOpen(false);
            }, 1000);
        } catch (error: unknown) {
            toast.error("Failed to create event. Please try again.", {
                description: errorMessage(error),
            });
        }
    };


    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-[#ff4d00] hover:bg-[#e64400] text-white">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Event
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border min-w-lg">
                <DialogHeader>
                    <DialogTitle className="text-xl font-semibold">Create Event</DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                        Fill in the details to create a new event
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit, (error) => {
                    console.log(error);
                })} className="space-y-4 mt-4">
                    {/* Title */}
                    <div className="space-y-2">
                        <Label htmlFor="title" className="text-sm font-medium text-muted-foreground">
                            Event Title
                        </Label>
                        <Input
                            id="title"
                            placeholder="Enter event title"
                            className="bg-background border-border focus:border-[#ff4d00] focus:ring-[#ff4d00]/20"
                            {...register("title")}
                        />
                        {errors.title && <p className="text-red-500 text-sm">{errors.title.message}</p>}
                    </div>

                    {/* Licence */}
                    <div className="space-y-2">
                        <Label htmlFor="licence" className="text-sm font-medium text-muted-foreground">
                            Licence
                        </Label>
                        <Select
                            defaultValue={Licence.FREE}
                            onValueChange={(value: Licence) => setValue("licence", value)}
                            value={watch("licence")}
                        >
                            <SelectTrigger className="bg-background w-full border-border focus:border-[#ff4d00] focus:ring-[#ff4d00]/20">
                                <SelectValue placeholder="Select licence" />
                            </SelectTrigger>
                            <SelectContent className="bg-card border-border">
                                <SelectItem value={Licence.FREE}>Free</SelectItem>
                                <SelectItem value={Licence.INVITE_ONLY}>Invite Only</SelectItem>
                                <SelectItem value={Licence.GEOTIME}>Geo Time</SelectItem>
                            </SelectContent>
                        </Select>
                        {errors.licence && <p className="text-red-500 text-sm">{errors.licence.message}</p>}
                    </div>

                    {
                        watch("licence") === Licence.GEOTIME && (
                            <>
                                {/* Location fields */}
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-muted-foreground">
                                        Location Coordinates
                                    </Label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <Label htmlFor="latitude" className="text-xs text-muted-foreground">
                                                Latitude
                                            </Label>
                                            <Input
                                                id="latitude"
                                                type="number"
                                                step="any"
                                                placeholder="e.g., 40.7128"
                                                className="bg-background border-border focus:border-[#ff4d00] focus:ring-[#ff4d00]/20"
                                                {...register("latitude")}
                                            />
                                            {errors.latitude && (
                                                <p className="text-red-500 text-xs">{errors.latitude.message}</p>
                                            )}
                                        </div>
                                        <div className="space-y-1">
                                            <Label htmlFor="longitude" className="text-xs text-muted-foreground">
                                                Longitude
                                            </Label>
                                            <Input
                                                id="longitude"
                                                type="number"
                                                step="any"
                                                placeholder="e.g., -74.0060"
                                                className="bg-background border-border focus:border-[#ff4d00] focus:ring-[#ff4d00]/20"
                                                {...register("longitude")}
                                            />
                                            {errors.longitude && (
                                                <p className="text-red-500 text-xs">{errors.longitude.message}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Radius field */}
                                <div className="space-y-2">
                                    <Label htmlFor="radius" className="text-sm font-medium text-muted-foreground">
                                        Radius (meters)
                                    </Label>
                                    <Input
                                        id="radius"
                                        type="number"
                                        placeholder="e.g., 1000"
                                        className="bg-background border-border focus:border-[#ff4d00] focus:ring-[#ff4d00]/20"
                                        {...register("radius")}
                                    />
                                    {errors.radius && (
                                        <p className="text-red-500 text-xs">{errors.radius.message}</p>
                                    )}
                                </div>


                                <div className="flex gap-4">
                                    {/* Start Time Picker */}
                                    <div className="space-y-2 w-full">
                                        <Label htmlFor="startTime" className="text-sm font-medium text-muted-foreground">
                                            Voting Start Time
                                        </Label>
                                        <DateTimePicker
                                            defaultValue={new Date(Date.now() + 10 * 60 * 1000)} // 10 minutes from now
                                            value={watch("geoVotingStart")}
                                            onChange={(date) => setValue("geoVotingStart", date)}
                                        />
                                        {errors.geoVotingStart && (
                                            <p className="text-red-500 text-xs">{errors.geoVotingStart.message}</p>
                                        )}
                                    </div>

                                    {/* End Time Picker */}
                                    <div className="space-y-2 w-full">
                                        <Label htmlFor="endTime" className="text-sm font-medium text-muted-foreground">
                                            Voting End Time
                                        </Label>

                                        <DateTimePicker
                                            defaultValue={new Date(Date.now() + 30 * 60 * 1000)} // 30 minutes from now
                                            value={watch("geoVotingEnd")}
                                            onChange={(date) => setValue("geoVotingEnd", date)}
                                        />
                                        {errors.geoVotingEnd && (
                                            <p className="text-red-500 text-xs">{errors.geoVotingEnd.message}</p>
                                        )}
                                    </div>
                                </div>

                            </>

                        )
                    }


                    {/* Public/Private Switch */}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-background border border-border">
                        <div className="space-y-0.5">
                            <Label htmlFor="privacy" className="text-sm font-medium text-muted-foreground">
                                {watch("privacy") === Privacy.PRIVATE
                                    ? "Private Event"
                                    : "Public Event"
                                }
                            </Label>
                            <p className="text-xs text-muted-foreground">
                                {watch("privacy") === Privacy.PRIVATE
                                    ? "Only invited users can see this event"
                                    : "Anyone can see this event"}
                            </p>
                        </div>
                        <Switch
                            id="privacy"
                            checked={watch('privacy') === Privacy.PRIVATE}
                            onCheckedChange={(checked) => {
                                setValue('privacy', checked ? Privacy.PRIVATE : Privacy.PUBLIC);
                            }}
                            className="data-[state=checked]:bg-[#ff4d00]"
                        />
                    </div>

                    {/* Submit */}
                    <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-[#ff4d00] hover:bg-[#e64400] text-white disabled:opacity-50"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Creating...
                            </>
                        ) : (
                            "Create Event"
                        )}
                    </Button>
                </form>
            </DialogContent>
        </Dialog >
    );
}