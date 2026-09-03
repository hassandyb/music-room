import { SignupForm } from "@/app/(auth)/components/register-form";
export default function SignupPage() {
  return (
    <div className="flex flex-col gap-4 p-6 w-full">
      <div className="flex flex-1 items-center justify-center">
        <div className="w-full max-w-xs">
          <SignupForm />
        </div>
      </div>
    </div>
  );
}
