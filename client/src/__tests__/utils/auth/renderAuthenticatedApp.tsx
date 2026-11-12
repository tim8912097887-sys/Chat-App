import { Route, Routes } from "react-router";
import AuthGuard from "../../../app/components/AuthGuard";
import LoginPage from "../../../features/auth/pages/LoginPage";
import RelationshipHomePage from "../../../features/relationship/pages/RelationshipHomePage";
import { useAuthStore } from "../../../features/auth/store/store";
import { customRender } from "../common/render";

export const renderAuthenticatedApp = () => {
  useAuthStore.setState({
    accessToken: "test-access-token",
    user: { id: "test-user-id", name: "Test User", imageUrl: null },
    status: "authenticated",
  });

  return customRender({
    uiArray: [
      {
        ui: (
          <Routes>
            <Route element={<AuthGuard />}>
              <Route path="/" element={<RelationshipHomePage />} />
            </Route>
            <Route path="/login" element={<LoginPage />} />
          </Routes>
        ),
        path: "*",
      },
    ],
    initialEntries: ["/"],
  });
};
