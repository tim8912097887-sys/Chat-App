import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { authBasedUrl } from "../../utils/auth/http";
import { renderAuthenticatedApp } from "../../utils/auth/renderAuthenticatedApp";
import { server } from "../../utils/common/server";
import { errorResponse } from "../../utils/common/response";
import { useAuthStore } from "../../../features/auth/store/store";

describe("Logout", () => {
  it("when logout succeeds should navigate to the login page", async () => {
    const { user } = renderAuthenticatedApp();

    await screen.findByRole("heading", { level: 1, name: /chatter/i });
    await user.click(
      screen.getByRole("button", { name: /user account settings menu/i }),
    );
    await user.click(screen.getByRole("menuitem", { name: /^log out$/i }));

    expect(
      await screen.findByRole("textbox", { name: /email/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { level: 1, name: /chatter/i }),
    ).not.toBeInTheDocument();
  });

  it.each([
    ["missing refresh token", "Missing refresh token"],
    ["invalid refresh token", "Invalid refresh token"],
  ])(
    "when server rejects logout for a %s should remain on the relationship page",
    async (_description, detail) => {
      server.use(
        http.post(`${authBasedUrl}/logout`, () =>
          HttpResponse.json(
            errorResponse({ code: "UnauthenticationError", detail }),
            { status: 401 },
          ),
        ),
      );
      const { user } = renderAuthenticatedApp();

      await screen.findByRole("heading", { level: 1, name: /chatter/i });
      await user.click(
        screen.getByRole("button", { name: /user account settings menu/i }),
      );
      await user.click(screen.getByRole("menuitem", { name: /^log out$/i }));
      await waitFor(() =>
        expect(
          screen.queryByRole("menuitem", { name: /^log out$/i }),
        ).not.toBeInTheDocument(),
      );

      expect(
        screen.getByRole("heading", { level: 1, name: /chatter/i }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("textbox", { name: /email/i }),
      ).not.toBeInTheDocument();
      expect(useAuthStore.getState().status).toBe("authenticated");
    },
  );
});
