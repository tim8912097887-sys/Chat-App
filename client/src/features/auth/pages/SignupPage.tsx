import type { SubmitEvent } from "react";
import { AuthLayout } from "../layouts/AuthLayout";
import { AuthHeader } from "../components/AuthHeader";
import { Input, InputContainer } from "../../../common/components/input";
import { Button } from "../../../common/components/button";
import AuthFooter from "../components/AuthFooter";

export default function SignupPage() {
  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    // const formData = new FormData(event.currentTarget);

    // TODO: Submit formData to your signup API.
    // formData contains name, email, password, and image.
  }

  return (
    <AuthLayout>
      <AuthHeader
        title="Create an account"
        description="Connect with friends and start chatting."
      />

      <form onSubmit={handleSubmit} className="space-y-5">
        <InputContainer id="name" label="Name" required>
          <Input
            id="name"
            name="name"
            type="text"
            placeholder="Enter your name"
            autoComplete="name"
            maxLength={100}
            required
          />
        </InputContainer>

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

        <InputContainer
          id="password"
          label="Password"
          hint="Use at least 8 characters."
          required
        >
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="Create a password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </InputContainer>

        <InputContainer
          id="image"
          label="Profile image"
          hint="Optional. PNG, JPEG, or WebP."
        >
          <Input
            id="image"
            name="image"
            type="file"
            accept="image/png,image/jpeg,image/webp"
          />
        </InputContainer>

        <Button type="submit" size="lg" variant="primary" fullWidth>
          Create account
        </Button>
      </form>

      <AuthFooter
        buttonText="Log in"
        description="Already have an account?"
        to="/login"
      />
    </AuthLayout>
  );
}
