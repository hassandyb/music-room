"use client";

import React, { useState, useRef, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Camera,
  ArrowRight,
  AlertCircle,
  Settings2,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useCreateProfileMutation } from "@/services/authApi";
import { useAppSelector } from "@/lib/rtk/hooks";
import { useDispatch } from "react-redux";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CreateProfileData,
  CreateProfileSchema,
} from "@/validations/profile/create-profile";
import { toast } from "sonner";
import { cn, errorMessage } from "@/lib/utils";
import { setUser } from "@/lib/rtk/userSlice";

const authInputClass =
  "!bg-white/5 !border-white/10 !text-white placeholder:!text-white/40 focus-visible:!border-[#ff4d00]/50 focus-visible:!ring-[#ff4d00]/20";

export default function OnBoardingPage() {
  const dispatch = useDispatch();
  const [createProfile] = useCreateProfileMutation();
  const user = useAppSelector((state) => state.user);

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const avatarInput = useRef<HTMLInputElement>(null);


  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateProfileData>({
    resolver: zodResolver(CreateProfileSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      searchPreferences: {
        youtube: { enabled: true },
        jamendo: { enabled: true },
      },
    },
  });

  useEffect(() => {
    if (user.user?.profile) {
      window.location.href = "/events";
    }
  }, [user]);


  const openFileInput = () => {
    avatarInput.current?.click();
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setAvatarPreview(previewUrl);
      setValue("avatar", file);
    }
  };

  // Handle search preference changes
  const handleSourceToggle = (source: "youtube" | "jamendo") => {
    setValue(`searchPreferences.${source}.enabled`, !watch(`searchPreferences.${source}.enabled`));
  };


  useEffect(() => {
    return () => {
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  const onSubmit = async (data: CreateProfileData) => {
    console.log(data);
    try {
      const profileFormData = new FormData();

      // Append all fields
      if (data.avatar) {
        profileFormData.append("avatar", data.avatar);
      }
      profileFormData.append("firstName", data.firstName);
      profileFormData.append("lastName", data.lastName);


      // Append search preferences as JSON string
      profileFormData.append(
        "searchPreferences",
        JSON.stringify({
          youtube: watch("searchPreferences.youtube"),
          jamendo: watch("searchPreferences.jamendo"),
        })
      );

      const res = await createProfile(profileFormData).unwrap();

      if (!res) {
        throw new Error("Failed to create profile");
      }

      dispatch(setUser(res));
      if (res.profile) {
        window.location.href = "/events";
      }
    } catch (err: unknown) {
      toast.error("Failed to create profile.", {
        description: errorMessage(err),
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit, (err) => console.log(err))} className="w-full">
      <div className="space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Create Your Profile</h1>
          <p className="text-muted-foreground">Let's get to know you better</p>
        </div>

        <div>
          <div className="pt-6 space-y-6">
            {/* Avatar Section */}
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <Avatar className="w-32 h-32 border-4 border-accent/30">
                  <AvatarImage src={avatarPreview || ""} alt="Profile avatar" />
                  <AvatarFallback className="bg-accent/10 text-4xl">
                    {watch("firstName")?.[0] || watch("lastName")?.[0] || "U"}
                  </AvatarFallback>
                </Avatar>
                <Input
                  onChange={handleAvatarChange}
                  accept="image/*"
                  type="file"
                  className="hidden"
                  ref={avatarInput}
                />
                <Button
                  onClick={openFileInput}
                  size="icon"
                  variant="secondary"
                  type="button"
                  className="absolute bottom-0 right-0 rounded-full border-2 border-background bg-accent hover:bg-accent/90 text-accent-foreground"
                >
                  <Camera className="h-4 w-4" />
                </Button>
              </div>
              {errors.avatar && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.avatar.message}
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                Click the camera to upload a photo (*)
              </p>
            </div>

            {/* Location & Preferences */}
            <div className="space-y-8">
              <div className="text-center">
                <h2 className="text-3xl font-bold mb-2">
                  Location & Preferences
                </h2>
                <p className="text-muted-foreground">
                  Help us connect you with the right people
                </p>
              </div>

              <div className="pt-6 space-y-6">
                <div className="flex gap-4 items-center">
                  <div className="space-y-2 flex-1">
                    <Label>First Name (*)</Label>
                    <Input
                      id="firstName"
                      {...register("firstName")}
                      placeholder="Jon"
                      className={cn(authInputClass, errors.firstName && "!border-red-500")}
                    />
                    {errors.firstName && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.firstName.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2 flex-1">
                    <Label>Last Name (*)</Label>
                    <Input
                      {...register("lastName")}
                      placeholder="Doe"
                      className={cn(authInputClass, errors.lastName && "!border-red-500")}
                    />
                    {errors.lastName && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.lastName.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Separator for Search Preferences */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="bg-white/10" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-background px-4 text-sm text-muted-foreground flex items-center gap-2">
                      <Settings2 className="h-4 w-4" />
                      Search Preferences
                    </span>
                  </div>
                </div>

                {/* Search Sources Section */}
                <div className="space-y-4">
                  <div className="grid gap-4">
                    {/* YouTube Source */}
                    <div className="flex items-center justify-between p-4">
                      <div className="flex items-start gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <Label>YouTube</Label>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            Best for mainstream music, covers, and live performances
                          </p>
                        </div>
                      </div>
                      <Switch
                        className="data-[state=checked]:bg-[#ff4d00]"
                        checked={watch("searchPreferences.youtube.enabled")}
                        onCheckedChange={() => handleSourceToggle("youtube")}
                      />
                    </div>
                    {errors.searchPreferences?.youtube && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.searchPreferences?.youtube?.enabled?.message}
                      </p>
                    )}

                    {/* Jamendo Source */}
                    <div className="flex items-center justify-between p-4">
                      <div className="flex items-start gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <Label>Jamendo</Label>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            Independent artists, creative commons, and royalty-free music
                          </p>
                        </div>
                      </div>
                      <Switch
                        className="data-[state=checked]:bg-[#ff4d00]"
                        checked={watch("searchPreferences.jamendo.enabled")}
                        onCheckedChange={() => handleSourceToggle("jamendo")}
                      />
                    </div>
                    {errors.searchPreferences?.jamendo && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.searchPreferences?.jamendo?.enabled?.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Separator className="bg-white/10 my-6" />

          <div className="w-full flex justify-end">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-accent text-white hover:bg-accent/90 disabled:opacity-50"
            >
              {isSubmitting ? "Creating..." : "Continue"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}