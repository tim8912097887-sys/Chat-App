import { AuthLayout } from "../layouts/AuthLayout";
import { AuthHeader } from "../components/AuthHeader";
import { Input, InputContainer } from "../../../common/components/input";
import { Button } from "../../../common/components/button";
import AuthFooter from "../components/AuthFooter";
import { useForm } from "react-hook-form";
import { loginSchema, type LoginInput } from "../input/login";
import { zodResolver } from "@hookform/resolvers/zod";
import { authQuery } from "../api/query/query";
import { ApiError } from "../../../common/error/api-error";
import SubmitError from "../components/SubmitError";
import { toast } from "react-toastify";

export default function LoginPage() {
  const { register, handleSubmit, formState, clearErrors, setError } =
    useForm<LoginInput>({
      resolver: zodResolver(loginSchema),
      mode: "onBlur",
    });

  async function onSubmit(input: LoginInput) {
    clearErrors();
    try {
      await authQuery.login(input);
      toast.success("Logged in successfully.");
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
        title="Welcome back"
        description="Log in to continue your conversations."
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {formState.errors.root?.server?.message && (
          <SubmitError message={formState.errors.root.server.message} />
        )}
        <InputContainer
          id="email"
          label="Email"
          error={formState.errors.email?.message}
          required
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
          required
          error={formState.errors.password?.message}
        >
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="Enter your password"
            autoComplete="current-password"
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
