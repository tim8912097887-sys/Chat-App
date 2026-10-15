import { AuthLayout } from "../layouts/AuthLayout";
import { AuthHeader } from "../components/AuthHeader";
import { Input, InputContainer } from "../../../common/components/input";
import { Button } from "../../../common/components/button";
import AuthFooter from "../components/AuthFooter";
import {
  signupSchema,
  type SignupFormInput,
  type SignupInput,
} from "../input/signup";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { authQuery } from "../api/query/query";
import { ApiError } from "../../../common/error/api-error";
import SubmitError from "../components/SubmitError";
import { useNavigate } from "react-router";
import { toast } from "react-toastify";

export default function SignupPage() {
  const navigation = useNavigate();
  const { register, handleSubmit, formState, clearErrors, setError } = useForm<
    SignupFormInput,
    unknown,
    SignupInput
  >({
    resolver: zodResolver(signupSchema),
    mode: "onBlur",
  });
  async function onSubmit(input: SignupInput) {
    clearErrors();
    try {
      await authQuery.signup(input);
      toast.success("Signed up successfully.");
      navigation("/login");
    } catch (error) {
      let message = "Unable to log in. Please try again.";
      if (error instanceof ApiError) {
        if (!error.status) {
          message =
            "Unable to connect to the server. Check your connection and try again.";
        } else {
          message = error.message;
        }
      }

      setError("root.server", {
        type: "server",
        message,
      });
    }
  }

  return (
    <AuthLayout>
      <AuthHeader
        title="Create an account"
        description="Connect with friends and start chatting."
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {formState.errors.root?.server?.message && (
          <SubmitError message={formState.errors.root.server.message} />
        )}
        <InputContainer
          id="name"
          label="Name"
          required
          error={formState.errors.name?.message}
        >
          <Input
            id="name"
            name="name"
            type="text"
            placeholder="Enter your name"
            autoComplete="name"
            maxLength={100}
            register={register}
          />
        </InputContainer>

        <InputContainer
          id="email"
          label="Email"
          required
          error={formState.errors.email?.message}
        >
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            autoCapitalize="none"
            register={register}
          />
        </InputContainer>

        <InputContainer
          id="password"
          label="Password"
          hint="Use at least 8 characters."
          required
          error={formState.errors.password?.message}
        >
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="Create a password"
            autoComplete="new-password"
            minLength={8}
            register={register}
          />
        </InputContainer>

        <InputContainer
          id="image"
          label="Profile image"
          hint="Optional. PNG, JPEG, or WebP."
          error={formState.errors.image?.message}
        >
          <Input
            id="image"
            name="image"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            register={register}
          />
        </InputContainer>

        <Button
          type="submit"
          loading={formState.isSubmitting}
          size="lg"
          variant="primary"
          fullWidth
        >
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
