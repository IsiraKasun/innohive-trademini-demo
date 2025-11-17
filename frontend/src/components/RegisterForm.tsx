import { FormEvent, useReducer, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { register } from "../services/api";
import { useAuth } from "../hooks/useAuth";
import Loader from "./Loader";

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
  dobDay: string;
  dobMonth: string;
  dobYear: string;
};

type FormAction =
  | { type: "UPDATE_FIELD"; field: keyof FormState; value: string }
  | { type: "RESET" };

const initialState: FormState = {
  firstName: "",
  lastName: "",
  email: "",
  username: "",
  password: "",
  confirmPassword: "",
  dobDay: "",
  dobMonth: "",
  dobYear: "",
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

const isEmailValid = (value: string) =>
  !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

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
  const isEmailFieldValid = hasValue(form.email) && isEmailValid(form.email);
  const isDobValid =
    hasValue(form.dobDay) && hasValue(form.dobMonth) && hasValue(form.dobYear);
  const isConfirmPasswordValid =
    hasValue(form.confirmPassword) && form.confirmPassword === form.password;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);

    if (
      !isFirstNameValid ||
      !isLastNameValid ||
      !isEmailFieldValid ||
      !isUsernameValid
    ) {
      toast.error("Please fill in all required fields correctly");
      return;
    }

    if (!isDobValid) {
      toast.error("Please select date of birth");
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
      const mm = String(form.dobMonth).padStart(2, "0");
      const dd = String(form.dobDay).padStart(2, "0");
      const dob = `${form.dobYear}-${mm}-${dd}`;
      const res = await register(form.username, form.password, {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        dob,
      });
      setLogin(res.token, res.username);
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
        <input
          className={fieldClass(isEmailFieldValid, form.email, submitted)}
          placeholder="Email"
          type="email"
          value={form.email}
          onChange={(e) =>
            dispatch({
              type: "UPDATE_FIELD",
              field: "email",
              value: e.target.value,
            })
          }
        />
        <input
          className={fieldClass(isUsernameValid, form.username, submitted)}
          placeholder="Username"
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
            <div className="text-xs text-muted flex items-center justify-between">
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
          value={form.confirmPassword}
          onChange={(e) =>
            dispatch({
              type: "UPDATE_FIELD",
              field: "confirmPassword",
              value: e.target.value,
            })
          }
        />

        <div>
          <div className="text-sm mb-1 text-muted">Date of birth</div>
          <div className="grid grid-cols-3 gap-2">
            <select
              className={fieldClass(isDobValid, form.dobDay, submitted)}
              value={form.dobDay}
              onChange={(e) =>
                dispatch({
                  type: "UPDATE_FIELD",
                  field: "dobDay",
                  value: e.target.value,
                })
              }
            >
              <option value="">Day</option>
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <select
              className={fieldClass(isDobValid, form.dobMonth, submitted)}
              value={form.dobMonth}
              onChange={(e) =>
                dispatch({
                  type: "UPDATE_FIELD",
                  field: "dobMonth",
                  value: e.target.value,
                })
              }
            >
              <option value="">Month</option>
              {months.map((m, idx) => (
                <option key={m} value={idx + 1}>
                  {m}
                </option>
              ))}
            </select>
            <select
              className={fieldClass(isDobValid, form.dobYear, submitted)}
              value={form.dobYear}
              onChange={(e) =>
                dispatch({
                  type: "UPDATE_FIELD",
                  field: "dobYear",
                  value: e.target.value,
                })
              }
            >
              <option value="">Year</option>
              {years().map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

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
