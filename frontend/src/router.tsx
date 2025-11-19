import { createBrowserRouter, Navigate } from "react-router-dom";
import App from "./App";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import CompetitionLeaderboard from "./pages/CompetitionLeaderboard";
import UpcomingCompetition from "./pages/UpcomingCompetition";
import { useAuth } from "./hooks/useAuth";

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "login", element: <Login /> },
      { path: "register", element: <Register /> },
      {
        path: "dashboard",
        element: (
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: "dashboard/leaderboard/:id",
        element: (
          <ProtectedRoute>
            <CompetitionLeaderboard />
          </ProtectedRoute>
        ),
      },
      {
        path: "dashboard/competition/:id",
        element: (
          <ProtectedRoute>
            <UpcomingCompetition />
          </ProtectedRoute>
        ),
      },
    ],
  },
]);
