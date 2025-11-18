import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { login } from "../services/api";
import { useAuth } from "../hooks/useAuth";
import Loader from "./Loader";

export default function LoginForm() {
  const { login: setLogin } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await login(username, password);
      setLogin(res.token, res.username, res.firstName, res.lastName);
      toast.success("Logged in");
      navigate("/dashboard");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="card p-6 space-y-4">
      <input
        className="input"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <input
        className="input"
        placeholder="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button className="btn w-full" disabled={loading}>
        {loading ? <Loader /> : "Login"}
      </button>
    </form>
  );
}
