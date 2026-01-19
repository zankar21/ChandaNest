import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { AuthProvider } from "../hooks/useAuth";
import ErrorBanner from "../components/ErrorBanner";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const auth = getAuth();
      await signInWithEmailAndPassword(auth, email, password);
      await auth.currentUser?.getIdToken(true);
      await auth.currentUser?.getIdTokenResult(true);
      console.log("signed in uid", auth.currentUser?.uid);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-app">
      <form onSubmit={onSubmit} className="w-full max-w-md rounded-xl border bg-surface p-6 shadow-sm space-y-4">
        <h1 className="text-xl font-semibold text-primary">Admin Login</h1>
        <div className="space-y-1">
          <label className="text-sm text-secondary">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border px-3 py-2"
            required
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm text-secondary">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border px-3 py-2"
            required
          />
        </div>
        {error && <ErrorBanner message={error} />}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-indigo-600 px-3 py-2 text-white font-semibold disabled:opacity-60"
        >
          {submitting ? "Signing in..." : "Login"}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <AuthProvider>
      <LoginForm />
    </AuthProvider>
  );
}



