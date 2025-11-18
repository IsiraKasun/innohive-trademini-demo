import { Outlet, Link, useNavigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import { useTheme } from "./hooks/useTheme";

export default function App() {
  const { token, firstName, lastName, logout } = useAuth();
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="app-header">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <Link to="/" className="logo-text">
            TradeMini
          </Link>
          <nav className="flex items-center gap-3">
            <span className="text-sm text-muted font-semibold">
              {firstName || lastName
                ? `${firstName ?? ""} ${lastName ?? ""}`.trim()
                : ""}
            </span>
            <button className="btn" onClick={toggle}>
              {theme === "dark" ? "Light Mode" : "Dark Mode"}
            </button>
            {token ? (
              <>
                <button
                  className="btn"
                  onClick={() => {
                    logout();
                    navigate("/login");
                  }}
                >
                  Logout
                </button>
              </>
            ) : (
              <div className="flex gap-2">
                <Link className="btn" to="/login">
                  Login
                </Link>
                <Link className="btn" to="/register">
                  Register
                </Link>
              </div>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1 app-main">
        <Outlet />
      </main>
      <footer className="app-footer">
        <div className="mx-auto max-w-6xl px-4 py-4 text-sm text-muted flex items-center justify-between">
          <span>
            © {new Date().getFullYear()} TradeMini - All Rights Reserved
          </span>
          <span>Developed by Isira Samaraweera</span>
        </div>
      </footer>
    </div>
  );
}
