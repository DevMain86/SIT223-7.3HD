import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Post from "./pages/Post";
import Pricing from "./pages/Pricing";
import Browse from "./pages/Browse";

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/post" element={<Post />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/browse" element={<Browse />} />
      </Route>
    </Routes>
  );
}

export default App;