import { createBrowserRouter, RouterProvider } from "react-router";
import LoginPage from "../features/auth/pages/LoginPage";
import SignupPage from "../features/auth/pages/SignupPage";
import App from "../App";
import NotFoundPage from "../common/components/pages/NotFoundPage";
import RelationshipHomePage from "../features/relationship/pages/RelationshipHomePage";
import AuthGuard from "./components/AuthGuard";
import GuestGuard from "./components/GuestGuard";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        element: <AuthGuard />,
        children: [
          {
            index: true,
            element: <RelationshipHomePage />,
          },
        ],
      },
      {
        element: <GuestGuard />,
        children: [
          {
            path: "/login",
            element: <LoginPage />,
          },
          {
            path: "/signup",
            element: <SignupPage />,
          },
        ],
      },
    ],
  },
  {
    path: "*",
    element: <NotFoundPage />,
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
