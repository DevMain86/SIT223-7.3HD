import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth(); // context login handler

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      toast.error("Please enter your email and password.");
      return;
    }

    try {
      const response = await fetch("http://localhost:3000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Save token + user (context + localStorage)
        login(data.token, data.user);
        toast.success(data.message);
        navigate("/"); // redirect after login
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error("Could not reach the server. Please try again later.");
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2 className="auth-card__title">Login</h2>

        <label className="auth-label">Your email</label>
        <input
          className="auth-input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label className="auth-label">Your password</label>
        <input
          className="auth-input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button className="auth-button" onClick={handleLogin}>
          Login
        </button>

        <p className="auth-switch">
          Don't have an account? <Link to="/signup">Sign up</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
