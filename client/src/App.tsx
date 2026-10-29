import { Outlet } from "react-router";
import { ToastContainer } from "react-toastify";
import { useInitializeSession } from "./common/hooks/useInitializeSession";

function App() {
  useInitializeSession();

  return (
    <>
      <Outlet />
      <ToastContainer />
    </>
  );
}

export default App;
