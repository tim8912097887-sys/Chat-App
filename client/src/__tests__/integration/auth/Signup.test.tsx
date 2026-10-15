import { describe, expect, it } from "vitest";
import { customRender } from "../../utils/common/render";
import SignupPage from "../../../features/auth/pages/SignupPage";
import { screen } from "@testing-library/react";
import LoginPage from "../../../features/auth/pages/LoginPage";
import { http, HttpResponse } from "msw";
import { errorResponse, successResponse } from "../../utils/common/response";
import { server } from "../../utils/common/server";
import { authBasedUrl } from "../../utils/auth/http";
import { signupResponse } from "../../utils/auth/factory";

describe("Signup", () => {
  describe("Success Load and Page Switch", () => {
    it("when successfully load signup page should display signup form", () => {
      customRender({
        uiArray: [
          {
            ui: (
              <>
                <SignupPage />
              </>
            ),
            path: "/signup",
          },
        ],
        initialEntries: ["/signup"],
      });

      expect(
        screen.getByText(/Connect with friends and start chatting./),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("textbox", { name: /name/i }),
      ).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /Log in/ })).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Create account/ }),
      ).toBeInTheDocument();
    });

    it("when click login link should navigate to login page", async () => {
      const { user } = customRender({
        uiArray: [
          {
            ui: (
              <>
                <SignupPage />
              </>
            ),
            path: "/signup",
          },
          {
            ui: (
              <>
                <LoginPage />
              </>
            ),
            path: "/login",
          },
        ],
        initialEntries: ["/signup"],
      });
      expect(screen.getByRole("link", { name: /Log in/ })).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Create account/ }),
      ).toBeInTheDocument();

      const loginLink = screen.getByRole("link", { name: /Log in/ });
      await user.click(loginLink);

      expect(
        await screen.findByRole("button", { name: /Log in/ }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /Create an account/ }),
      ).toBeInTheDocument();
    });

    it("when successfully signup should navigate to login page", async () => {
      const { user } = customRender({
        uiArray: [
          {
            ui: (
              <>
                <SignupPage />
              </>
            ),
            path: "/signup",
          },
          {
            ui: (
              <>
                <LoginPage />
              </>
            ),
            path: "/login",
          },
        ],
        initialEntries: ["/signup"],
      });
      expect(screen.getByRole("link", { name: /Log in/ })).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Create account/ }),
      ).toBeInTheDocument();

      const nameInput = screen.getByRole("textbox", { name: /name/i });
      const emailInput = screen.getByRole("textbox", { name: /email/i });
      const passwordInput = screen.getByLabelText(/password/i);
      await user.type(nameInput, "Test User");
      await user.type(emailInput, "xGZ5e@example.com");
      await user.type(passwordInput, "Password123!");
      await user.click(screen.getByRole("button", { name: /Create account/ }));

      expect(
        await screen.findByRole("button", { name: /Log in/ }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /Create an account/ }),
      ).toBeInTheDocument();
    });

    it("when successfully signup with an image should upload the image and navigate to login page", async () => {
      let uploadedRequestBody: string | undefined;
      server.use(
        http.post(`${authBasedUrl}/signup`, async ({ request }) => {
          uploadedRequestBody = await request.text();
          return HttpResponse.json(successResponse(signupResponse()));
        }),
      );

      const { user } = customRender({
        uiArray: [
          {
            ui: (
              <>
                <SignupPage />
              </>
            ),
            path: "/signup",
          },
          {
            ui: (
              <>
                <LoginPage />
              </>
            ),
            path: "/login",
          },
        ],
        initialEntries: ["/signup"],
      });

      const image = new File(["image contents"], "profile.png", {
        type: "image/png",
      });
      await user.type(
        screen.getByRole("textbox", { name: /name/i }),
        "Test User",
      );
      await user.type(
        screen.getByRole("textbox", { name: /email/i }),
        "xGZ5e@example.com",
      );
      await user.type(screen.getByLabelText(/password/i), "Password123!");
      await user.upload(screen.getByLabelText(/profile image/i), image);
      await user.click(screen.getByRole("button", { name: /Create account/ }));

      expect(
        await screen.findByRole("button", { name: /Log in/ }),
      ).toBeInTheDocument();
      expect(uploadedRequestBody).toContain('filename="profile.png"');
      expect(uploadedRequestBody).toContain("image contents");
    });
  });

  describe("Client Error", () => {
    it("when name is invalid should display name validation error", async () => {
      const { user } = customRender({
        uiArray: [{ ui: <SignupPage />, path: "/signup" }],
        initialEntries: ["/signup"],
      });

      await user.type(screen.getByRole("textbox", { name: /name/i }), "A");
      await user.type(
        screen.getByRole("textbox", { name: /email/i }),
        "xGZ5e@example.com",
      );
      await user.type(screen.getByLabelText(/password/i), "Password123!");
      await user.click(screen.getByRole("button", { name: /Create account/ }));

      expect(
        await screen.findByText("name must be at least 2 characters"),
      ).toBeInTheDocument();
    });

    it("when email is invalid should display email validation error", async () => {
      const { user } = customRender({
        uiArray: [{ ui: <SignupPage />, path: "/signup" }],
        initialEntries: ["/signup"],
      });

      await user.type(
        screen.getByRole("textbox", { name: /name/i }),
        "Test User",
      );
      await user.type(
        screen.getByRole("textbox", { name: /email/i }),
        "invalid",
      );
      await user.type(screen.getByLabelText(/password/i), "Password123!");
      await user.click(screen.getByRole("button", { name: /Create account/ }));

      expect(await screen.findByText("email is invalid")).toBeInTheDocument();
    });

    it("when password is invalid should display password validation error", async () => {
      const { user } = customRender({
        uiArray: [{ ui: <SignupPage />, path: "/signup" }],
        initialEntries: ["/signup"],
      });

      await user.type(
        screen.getByRole("textbox", { name: /name/i }),
        "Test User",
      );
      await user.type(
        screen.getByRole("textbox", { name: /email/i }),
        "xGZ5e@example.com",
      );
      await user.type(screen.getByLabelText(/password/i), "short");
      await user.click(screen.getByRole("button", { name: /Create account/ }));

      expect(
        await screen.findByText("password must be at least 8 characters"),
      ).toBeInTheDocument();
    });

    it("when image is invalid should display image validation error", async () => {
      const { user } = customRender({
        uiArray: [{ ui: <SignupPage />, path: "/signup" }],
        initialEntries: ["/signup"],
      });

      await user.type(
        screen.getByRole("textbox", { name: /name/i }),
        "Test User",
      );
      await user.type(
        screen.getByRole("textbox", { name: /email/i }),
        "xGZ5e@example.com",
      );
      await user.type(screen.getByLabelText(/password/i), "Password123!");
      const oversizedImage = new File(
        [new Uint8Array(5 * 1024 * 1024 + 1)],
        "large.png",
        { type: "image/png" },
      );
      await user.upload(
        screen.getByLabelText(/profile image/i),
        oversizedImage,
      );
      await user.click(screen.getByRole("button", { name: /Create account/ }));

      expect(
        await screen.findByText("Image must be 5 MB or smaller."),
      ).toBeInTheDocument();
    });
  });

  describe("Server Error", () => {
    it("when signup fails on the server should display the server error", async () => {
      server.use(
        http.post(`${authBasedUrl}/signup`, () => {
          return HttpResponse.json(
            errorResponse({
              code: "INTERNAL_SERVER_ERROR",
              detail: "Unable to create account. Please try again.",
            }),
            { status: 500 },
          );
        }),
      );

      const { user } = customRender({
        uiArray: [{ ui: <SignupPage />, path: "/signup" }],
        initialEntries: ["/signup"],
      });

      await user.type(
        screen.getByRole("textbox", { name: /name/i }),
        "Test User",
      );
      await user.type(
        screen.getByRole("textbox", { name: /email/i }),
        "xGZ5e@example.com",
      );
      await user.type(screen.getByLabelText(/password/i), "Password123!");
      await user.click(screen.getByRole("button", { name: /Create account/ }));

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Unable to create account. Please try again.",
      );
    });
  });
});
