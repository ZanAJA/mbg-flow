import { Suspense } from "react";
import { LoginContainer } from "@/feature/auth/container/login-container";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContainer />
    </Suspense>
  );
}
