import { Link, useNavigate } from "react-router-dom";
import { FaSearch } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";

function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();        // clear session state + localStorage
    navigate("/");   // redirect to home
  };

  return (
    <nav className="nav">
      {/* Logo → home */}
      <Link to="/" className="nav__logo">
        DEV@Deakin
      </Link>

      {/* Visual-only search field */}
      <div className="nav__search">
        <FaSearch className="nav__search-icon" />
        <input
          type="text"
          placeholder="Search..."
          className="nav__search-input"
        />
      </div>

      <div className="nav__actions">
        {/* Main navigation links */}
        <Link to="/pricing" className="nav__link">
          Pricing
        </Link>
        <Link to="/post" className="nav__link">
          Post
        </Link>
        <Link to="/browse" className="nav__link">
          Browse
        </Link>

        {/* Auth‑aware actions */}
        {user ? (
          <>
            <span className="nav__user">Hi, {user.name}</span>
            <button className="nav__link nav__logout" onClick={handleLogout}>
              Logout
            </button>
          </>
        ) : (
          <Link to="/login" className="nav__link">
            Login
          </Link>
        )}
      </div>
    </nav>
  );
}

export default NavBar;
