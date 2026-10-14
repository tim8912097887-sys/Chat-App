import type { SubmitEvent } from "react";
import { AuthLayout } from "../layouts/AuthLayout";
import { AuthHeader } from "../components/AuthHeader";
import { Input, InputContainer } from "../../../common/components/input";
import { Button } from "../../../common/components/button";
import AuthFooter from "../components/AuthFooter";

export default function LoginPage() {
  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    // const formData = new FormData(event.currentTarget);

    // TODO: Submit email and password to your login API.
  }

  return (
    <AuthLayout>
      <AuthHeader
        title="Welcome back"
        description="Log in to continue your conversations."
      />

      <form onSubmit={handleSubmit} className="space-y-5">
        <InputContainer id="email" label="Email" required>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            autoCapitalize="none"
            required
          />
        </InputContainer>

        <InputContainer id="password" label="Password" required>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="Enter your password"
            autoComplete="current-password"
            required
          />
        </InputContainer>

        <Button type="submit" size="lg" variant="primary" fullWidth>
          Log in
        </Button>
      </form>

      <AuthFooter
        to="/signup"
        buttonText="Create an account"
        description="Don't have an account?"
      />
    </AuthLayout>
  );
}
