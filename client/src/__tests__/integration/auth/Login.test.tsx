import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { toast } from "react-toastify";
import LoginPage from "../../../features/auth/pages/LoginPage";
import SignupPage from "../../../features/auth/pages/SignupPage";
import { customRender } from "../../utils/common/render";
import { authBasedUrl } from "../../utils/auth/http";
import { errorResponse } from "../../utils/common/response";
import { server } from "../../utils/common/server";

describe("Login", () => {
  describe("Success Load and Page Switch", () => {
    it("when successfully load login page should display login form", () => {
      customRender({
        uiArray: [{ ui: <LoginPage />, path: "/login" }],
        initialEntries: ["/login"],
      });

      expect(
        screen.getByText(/Log in to continue your conversations./),
      ).toBeInTheDocument();
      expect(screen.getByRole("textbox", { name: /email/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /Create an account/ })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Log in/ })).toBeInTheDocument();
    });

    it("when successfully login should display login success notification", async () => {
      const successToast = vi.spyOn(toast, "success");
      const { user } = customRender({
        uiArray: [{ ui: <LoginPage />, path: "/login" }],
        initialEntries: ["/login"],
      });

      await user.type(
        screen.getByRole("textbox", { name: /email/i }),
        "xGZ5e@example.com",
      );
      await user.type(screen.getByLabelText(/password/i), "Password123!");
      await user.click(screen.getByRole("button", { name: /Log in/ }));

      await waitFor(() => {
        expect(successToast).toHaveBeenCalledWith("Logged in successfully.");
      });
    });

    it("when click create account link should navigate to signup page", async () => {
      const { user } = customRender({
        uiArray: [
          { ui: <LoginPage />, path: "/login" },
          { ui: <SignupPage />, path: "/signup" },
        ],
        initialEntries: ["/login"],
      });

      await user.click(screen.getByRole("link", { name: /Create an account/ }));

      expect(
        await screen.findByText(/Connect with friends and start chatting./),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Create account/ }),
      ).toBeInTheDocument();
    });
  });

  describe("Client Error", () => {
    it("when email is invalid should display email validation error", async () => {
      const { user } = customRender({
        uiArray: [{ ui: <LoginPage />, path: "/login" }],
        initialEntries: ["/login"],
      });

      await user.type(
        screen.getByRole("textbox", { name: /email/i }),
        "invalid",
      );
      await user.type(screen.getByLabelText(/password/i), "Password123!");
      await user.click(screen.getByRole("button", { name: /Log in/ }));

      expect(await screen.findByText("email is invalid")).toBeInTheDocument();
    });

    it("when password is invalid should display password validation error", async () => {
      const { user } = customRender({
        uiArray: [{ ui: <LoginPage />, path: "/login" }],
        initialEntries: ["/login"],
      });

      await user.type(
        screen.getByRole("textbox", { name: /email/i }),
        "xGZ5e@example.com",
      );
      await user.type(screen.getByLabelText(/password/i), "short");
      await user.click(screen.getByRole("button", { name: /Log in/ }));

      expect(
        await screen.findByText("password must be at least 8 characters"),
      ).toBeInTheDocument();
    });
  });

  describe("Business Logic", () => {
    it("when email does not exist should display invalid credentials error", async () => {
      server.use(
        http.post(`${authBasedUrl}/login`, () =>
          HttpResponse.json(
            errorResponse({
              code: "INVALID_CREDENTIALS",
              detail: "Email or password is incorrect.",
            }),
            { status: 400 },
          ),
        ),
      );

      const { user } = customRender({
        uiArray: [{ ui: <LoginPage />, path: "/login" }],
        initialEntries: ["/login"],
      });

      await user.type(
        screen.getByRole("textbox", { name: /email/i }),
        "missing@example.com",
      );
      await user.type(screen.getByLabelText(/password/i), "Password123!");
      await user.click(screen.getByRole("button", { name: /Log in/ }));

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Email or password is incorrect.",
      );
    });

    it("when password is incorrect should display invalid credentials error", async () => {
      server.use(
        http.post(`${authBasedUrl}/login`, () =>
          HttpResponse.json(
            errorResponse({
              code: "INVALID_CREDENTIALS",
              detail: "Email or password is incorrect.",
            }),
            { status: 400 },
          ),
        ),
      );

      const { user } = customRender({
        uiArray: [{ ui: <LoginPage />, path: "/login" }],
        initialEntries: ["/login"],
      });

      await user.type(
        screen.getByRole("textbox", { name: /email/i }),
        "xGZ5e@example.com",
      );
      await user.type(screen.getByLabelText(/password/i), "WrongPassword!");
      await user.click(screen.getByRole("button", { name: /Log in/ }));

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Email or password is incorrect.",
      );
    });

    it("when login is locked should display account locked error", async () => {
      server.use(
        http.post(`${authBasedUrl}/login`, () =>
          HttpResponse.json(
            errorResponse({
              code: "LOGIN_LOCKED",
              detail: "Account locked.",
            }),
            { status: 409 },
          ),
        ),
      );

      const { user } = customRender({
        uiArray: [{ ui: <LoginPage />, path: "/login" }],
        initialEntries: ["/login"],
      });

      await user.type(
        screen.getByRole("textbox", { name: /email/i }),
        "xGZ5e@example.com",
      );
      await user.type(screen.getByLabelText(/password/i), "WrongPassword!");
      await user.click(screen.getByRole("button", { name: /Log in/ }));

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Account locked.",
      );
    });
  });

  describe("Server Error", () => {
    it("when login fails on the server should display the server error", async () => {
      server.use(
        http.post(`${authBasedUrl}/login`, () =>
          HttpResponse.json(
            errorResponse({
              code: "INTERNAL_SERVER_ERROR",
              detail: "Unable to log in. Please try again.",
            }),
            { status: 500 },
          ),
        ),
      );

      const { user } = customRender({
        uiArray: [{ ui: <LoginPage />, path: "/login" }],
        initialEntries: ["/login"],
      });

      await user.type(
        screen.getByRole("textbox", { name: /email/i }),
        "xGZ5e@example.com",
      );
      await user.type(screen.getByLabelText(/password/i), "Password123!");
      await user.click(screen.getByRole("button", { name: /Log in/ }));

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Unable to log in. Please try again.",
      );
    });
  });
});
