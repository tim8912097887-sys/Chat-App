import { Outlet } from "react-router";
import useSocketConnection from "../../../realtime/hooks/useSocketConnection";
import useRealtimeEvents from "../../../realtime/hooks/useRealtimeEvents";

function AuthenticatedLayout() {
  // Register listeners before initiating the connection.
  useRealtimeEvents();
  useSocketConnection();

  return <Outlet />;
}

export default AuthenticatedLayout;
