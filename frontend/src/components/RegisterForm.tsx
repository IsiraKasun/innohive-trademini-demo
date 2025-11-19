import { FormEvent, useReducer, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { register } from "../services/api";
import { useAuth } from "../hooks/useAuth";
import Loader from "./Loader";

type FormState = {
  firstName: string;
  lastName: string;
  username: string;
  password: string;
  confirmPassword: string;
};

type FormAction =
  | { type: "UPDATE_FIELD"; field: keyof FormState; value: string }
  | { type: "RESET" };

const initialState: FormState = {
  firstName: "",
  lastName: "",
  username: "",
  password: "",
  confirmPassword: "",
};

function reducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case "UPDATE_FIELD":
      return { ...state, [action.field]: action.value };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

const months = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function years() {
  const now = new Date().getFullYear();
  const arr: number[] = [];
  for (let y = now - 12; y >= now - 100; y--) arr.push(y);
  return arr;
}

const hasValue = (value: string) => value.trim().length > 0;

const passwordInfo = (value: string) => {
  const hasDigit = /[0-9]/.test(value);
  const hasUpper = /[A-Z]/.test(value);
  const hasSpecial = /[^A-Za-z0-9]/.test(value);
  const lengthScore = value.length >= 12 ? 2 : value.length >= 8 ? 1 : 0;
  const varietyScore = [hasDigit, hasUpper, hasSpecial].filter(Boolean).length;
  const score = lengthScore + varietyScore;

  let strength: "weak" | "medium" | "strong" | "" = "";

  if (!value) {
    strength = "";
  } else if (score <= 2) {
    strength = "weak";
  } else if (score === 3) {
    strength = "medium";
  } else {
    strength = "strong";
  }

  const isValid = hasDigit && hasUpper && hasSpecial;
  return { strength, isValid };
};

const fieldClass = (valid: boolean, value: string, submitted: boolean) => {
  const base = "input";
  if (!submitted && !hasValue(value)) return base;
  if (!valid) return base + " border-red-500";
  return base + " border-green-500";
};

export default function RegisterForm() {
  const { login: setLogin } = useAuth();
  const navigate = useNavigate();
  const [form, dispatch] = useReducer(reducer, initialState);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const { strength: passwordStrength, isValid: isPasswordValid } = passwordInfo(
    form.password
  );

  const isFirstNameValid = hasValue(form.firstName);
  const isLastNameValid = hasValue(form.lastName);
  const isUsernameValid = hasValue(form.username);
  const isConfirmPasswordValid =
    hasValue(form.confirmPassword) && form.confirmPassword === form.password;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);

    if (!isFirstNameValid) {
      toast.error("First name is required");
      return;
    }

    if (!isLastNameValid) {
      toast.error("Last name is required");
      return;
    }

    if (!isUsernameValid) {
      toast.error("Username is required");
      return;
    }

    if (!isPasswordValid) {
      toast.error(
        "Password must contain at least one digit, one uppercase letter and one special character"
      );
      return;
    }

    if (!isConfirmPasswordValid) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await register(form.username, form.password, {
        firstName: form.firstName,
        lastName: form.lastName,
      });
      setLogin(res.token, res.username, res.firstName, res.lastName);
      toast.success("Registered successfully");
      navigate("/dashboard");
    } catch (e: any) {
      const data = e?.response?.data;
      if (data?.errors && typeof data.errors === "object") {
        const messages = Object.values<string>(data.errors).filter(Boolean);
        if (messages.length) {
          toast.error(messages.join(" | "));
          return;
        }
      }
      toast.error(data?.message || "Register failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={onSubmit} className="card p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            className={fieldClass(isFirstNameValid, form.firstName, submitted)}
            placeholder="First name"
            maxLength={100}
            value={form.firstName}
            onChange={(e) =>
              dispatch({
                type: "UPDATE_FIELD",
                field: "firstName",
                value: e.target.value,
              })
            }
          />
          <input
            className={fieldClass(isLastNameValid, form.lastName, submitted)}
            placeholder="Last name"
            maxLength={100}
            value={form.lastName}
            onChange={(e) =>
              dispatch({
                type: "UPDATE_FIELD",
                field: "lastName",
                value: e.target.value,
              })
            }
          />
        </div>
        {/* Email field removed as backend no longer uses email */}
        <input
          className={fieldClass(isUsernameValid, form.username, submitted)}
          placeholder="Username"
          maxLength={50}
          value={form.username}
          onChange={(e) =>
            dispatch({
              type: "UPDATE_FIELD",
              field: "username",
              value: e.target.value,
            })
          }
        />
        <div className="space-y-1">
          <input
            className={fieldClass(isPasswordValid, form.password, submitted)}
            placeholder="Password"
            type="password"
            maxLength={100}
            value={form.password}
            onChange={(e) =>
              dispatch({
                type: "UPDATE_FIELD",
                field: "password",
                value: e.target.value,
              })
            }
          />
          {form.password && (
            <div className="text-xs text-muted flex font-semibold items-center justify-between">
              <span>
                Password strength:{" "}
                <span
                  className={
                    passwordStrength === "strong"
                      ? "text-green-500"
                      : passwordStrength === "medium"
                      ? "text-yellow-500"
                      : "text-red-500"
                  }
                >
                  {passwordStrength.charAt(0).toUpperCase() +
                    passwordStrength.slice(1)}
                </span>
              </span>
            </div>
          )}
        </div>
        <input
          className={fieldClass(
            isConfirmPasswordValid,
            form.confirmPassword,
            submitted
          )}
          placeholder="Confirm password"
          type="password"
          maxLength={100}
          value={form.confirmPassword}
          onChange={(e) =>
            dispatch({
              type: "UPDATE_FIELD",
              field: "confirmPassword",
              value: e.target.value,
            })
          }
        />

        {/* Date of birth fields removed as backend no longer uses dob */}

        <button className="btn w-full" disabled={loading}>
          {loading ? <Loader /> : "Create Account"}
        </button>
      </form>
      <p className="mt-4 text-sm text-muted white-text">
        Have an account?{" "}
        <Link className="underline" to="/login">
          Login
        </Link>
      </p>
    </>
  );
}
