

import { LoginForm } from "@/app/(auth)/components/login-form";

export default function LoginPage() {
  return (
    <div className="flex flex-col gap-4 p-6 w-full">
      <div className="flex flex-1 items-center justify-center">
        <div className="w-full max-w-xs">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
