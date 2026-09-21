// Wraps every page with the shared NavBar and Footer so they appear identically
// across the whole app. Also hosts the toast container so any page can fire notifications.
import { Outlet } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import NavBar from "./NavBar";
import Footer from "./Footer";

function Layout() {
  return (
    <>
      <NavBar />
      <Outlet />
      <Footer />
      <ToastContainer position="top-center" autoClose={3000} />
    </>
  );
}

export default Layout;