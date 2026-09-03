"use client";

import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Edit2, Camera, AlertCircle } from "lucide-react";
import { cn, errorMessage, ImageUrl } from "@/lib/utils";
import { UserWithProfile } from "@repo/types";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  EditProfileData,
  EditProfileSchema,
} from "@/validations/profile/edit-profile";
import { toast } from "sonner";
import { useUpdateProfileMutation } from "@/services/authApi";
import { useRouter } from "next/navigation";

interface UpdateProfileDialogProps {
  userData: UserWithProfile;
}

export function UpdateProfileDialog({ userData }: UpdateProfileDialogProps) {
  const [open, setOpen] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    userData?.profile?.avatarUrl ? ImageUrl(userData.profile.avatarUrl) : null,
  );
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [updateProfile, { isLoading }] = useUpdateProfileMutation();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<EditProfileData>({
    resolver: zodResolver(EditProfileSchema),
    defaultValues: {
      firstName: userData?.profile?.firstName || "",
      lastName: userData?.profile?.lastName || "",
      username: userData?.username || "",
    },
  });

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
        setAvatarFile(file);
        setValue("avatar", file);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: EditProfileData) => {
    try {
      const formData = new FormData();

      if (avatarFile) {
        formData.append("avatar", avatarFile);
      }
      formData.append("firstName", data.firstName || "");
      formData.append("lastName", data.lastName || "");
      formData.append("username", data.username || "");

      await updateProfile(formData).unwrap();

      router.refresh();
      setOpen(false);
    } catch (error: unknown) {
      toast.error("Failed to update profile", {
        description: errorMessage(error),
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[#ff4d00] hover:bg-[#e64400] text-white">
          <Edit2 className="mr-2 h-4 w-4" />
          Edit Profile
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:min-w-[500px] md:min-w-[700px] max-h-[90vh] p-4 overflow-y-auto bg-card border-border text-foreground">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">
            Update Profile
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Make changes to your profile information. Click save when you're
            done.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Avatar Upload */}
          <div className="flex items-center gap-6 px-6">
            <div className="relative">
              <Avatar className="h-24 w-24 border-2 border-[#ff4d00]/20">
                <AvatarImage src={avatarPreview || undefined} />
                <AvatarFallback className="bg-accent/20 uppercase text-[#ff4d00] text-xl font-semibold">
                  {watch("firstName")?.[0] || watch("username")?.[0] || "U"}
                </AvatarFallback>
              </Avatar>
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-[#ff4d00] hover:bg-[#e64400] border-2 border-card"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera className="h-4 w-4" />
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Profile Picture</p>
              <p className="text-xs text-muted-foreground">
                Upload a new profile picture. Recommended size: 400x400px.
              </p>
              {errors.avatar && (
                <p className="text-sm text-red-500 flex items-center gap-1 mt-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.avatar.message}
                </p>
              )}
            </div>
          </div>

          {/* Personal Information */}
          <div className="grid grid-cols-2 gap-4 px-6">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                {...register("firstName")}
                disabled={isSubmitting || isLoading}
                className={cn(
                  "bg-white/5 border-white/10",
                  errors.firstName && "border-red-500"
                )}
              />
              {errors.firstName && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.firstName.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                {...register("lastName")}
                disabled={isSubmitting || isLoading}
                className={cn(
                  "bg-white/5 border-white/10",
                  errors.lastName && "border-red-500"
                )}
              />
              {errors.lastName && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.lastName.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2 px-6">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              {...register("username")}
              disabled={isSubmitting || isLoading}
              className={cn(
                "bg-white/5 border-white/10",
                errors.username && "border-red-500"
              )}
            />
            {errors.username && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.username.message}
              </p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="border-white/10 hover:bg-white/5"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || isSubmitting}
              className="bg-[#ff4d00] hover:bg-[#e64400] text-white disabled:opacity-50"
            >
              {isLoading || isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
