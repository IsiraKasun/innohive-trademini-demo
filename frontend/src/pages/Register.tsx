import { Link } from "react-router-dom";
import { useTheme } from "../hooks/useTheme";
import RegisterForm from "../components/RegisterForm";
import bgDark from "../assets/img/background-dark.png";
import bgLight from "../assets/img/background-light.png";

export default function Register() {
  const { theme } = useTheme();

  return (
    <div className="min-h-[calc(100vh-120px)] flex items-center justify-center bg-wrapper">
      <img
        src={theme === "dark" ? bgDark : bgLight}
        alt=""
        className="bg-img"
      />
      <div className="relative w-full max-w-md px-4 py-12">
        <h1 className="text-2xl font-semibold mb-6 white-text">
          Create Account
        </h1>
        <RegisterForm />
      </div>
    </div>
  );
}
