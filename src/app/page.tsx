import { Suspense } from "react";
import { LoginContainer } from "@/feature/auth/container/login-container";

export default function HomePage() {
  return (
    <Suspense>
      <LoginContainer />
    </Suspense>
  );
}
