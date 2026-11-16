import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { Route, Routes } from "react-router";
import ProfilePage from "../../../features/user/pages/ProfilePage";
import RelationshipHomePage from "../../../features/relationship/pages/RelationshipHomePage";
import { useAuthStore } from "../../../features/auth/store/store";
import { customRender } from "../../utils/common/render";
import { errorResponse, successResponse } from "../../utils/common/response";
import { server } from "../../utils/common/server";
import { userBasedUrl } from "../../utils/user/http";

describe("User profile", () => {
  describe("Success Load", () => {
    it("when the profile loads successfully should display the current user's profile", async () => {
      let authorization: string | null = null;
      server.use(
        http.get(`${userBasedUrl}/profile`, ({ request }) => {
          authorization = request.headers.get("authorization");
          return HttpResponse.json(
            successResponse({
              id: "test-user-id",
              name: "Test User",
              email: "test@example.com",
              imageUrl: null,
              searchCode: "TEST1234",
            }),
          );
        }),
      );
      useAuthStore.setState({
        accessToken: "test-access-token",
        user: {
          id: "test-user-id",
          name: "Test User",
          imageUrl: null,
          searchCode: "TEST1234",
        },
        status: "authenticated",
      });

      customRender({
        uiArray: [{ ui: <ProfilePage />, path: "*" }],
        initialEntries: ["/profile"],
      });

      expect(await screen.findAllByText("test@example.com")).toHaveLength(2);
      expect(screen.getByText("TEST1234")).toBeInTheDocument();
      await waitFor(() => {
        expect(authorization).toBe("Bearer test-access-token");
      });
    });

    it("when clicking back to friends should return to the relationship home page", async () => {
      server.use(
        http.get(`${userBasedUrl}/profile`, () =>
          HttpResponse.json(
            successResponse({
              id: "test-user-id",
              name: "Test User",
              email: "test@example.com",
              imageUrl: null,
              searchCode: "TEST1234",
            }),
          ),
        ),
      );
      useAuthStore.setState({
        accessToken: "test-access-token",
        user: {
          id: "test-user-id",
          name: "Test User",
          imageUrl: null,
          searchCode: "TEST1234",
        },
        status: "authenticated",
      });

      const { user } = customRender({
        uiArray: [
          {
            ui: (
              <Routes>
                <Route path="/" element={<RelationshipHomePage />} />
                <Route path="/profile" element={<ProfilePage />} />
              </Routes>
            ),
            path: "*",
          },
        ],
        initialEntries: ["/profile"],
      });

      await user.click(
        await screen.findByRole("link", { name: /Back to Friends/i }),
      );

      expect(
        await screen.findByRole("heading", { level: 1, name: /Chatter/i }),
      ).toBeInTheDocument();
    });
  });

  describe("Error", () => {
    it("when the profile fails to load should display the retry section", async () => {
      server.use(
        http.get(`${userBasedUrl}/profile`, () =>
          HttpResponse.json(
            errorResponse({
              code: "UnauthenticationError",
              detail: "Unable to load profile.",
            }),
            { status: 401 },
          ),
        ),
      );
      useAuthStore.setState({
        accessToken: "test-access-token",
        user: {
          id: "test-user-id",
          name: "Test User",
          imageUrl: null,
          searchCode: "TEST1234",
        },
        status: "authenticated",
      });

      customRender({
        uiArray: [{ ui: <ProfilePage />, path: "*" }],
        initialEntries: ["/profile"],
      });

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Unable to load profile.",
      );
      expect(
        screen.getByRole("button", { name: /Try again/i }),
      ).toBeInTheDocument();
    });
  });
});
