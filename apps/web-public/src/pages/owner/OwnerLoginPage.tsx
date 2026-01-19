import { useEffect, useRef, useState } from "react";
import { PhoneAuthProvider, RecaptchaVerifier, signInWithCredential } from "firebase/auth";
import { auth } from "../../services/firebase";
import { useNavigate } from "react-router-dom";
import { useOwnerAuth } from "../../hooks/useOwnerAuth";
import { setAuthToken } from "../../services/apiClient";

export default function OwnerLoginPage() {
  const [phone, setPhone] = useState("+91");
  const [otp, setOtp] = useState("");
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { user, loading } = useOwnerAuth();
  const recaptchaRef = useRef<HTMLDivElement | null>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const recaptchaWidgetIdRef = useRef<number | null>(null);
  const recaptchaInitRef = useRef<Promise<RecaptchaVerifier> | null>(null);

  const ensureRecaptcha = async () => {
    if (recaptchaVerifierRef.current) return recaptchaVerifierRef.current;
    if (recaptchaInitRef.current) return recaptchaInitRef.current;
    recaptchaInitRef.current = (async () => {
      recaptchaVerifierRef.current = new RecaptchaVerifier(auth, "recaptcha-container", {
        size: "invisible"
      });
      try {
        recaptchaWidgetIdRef.current = await recaptchaVerifierRef.current.render();
        return recaptchaVerifierRef.current;
      } catch (err) {
        console.error("recaptcha render error", err);
        recaptchaVerifierRef.current?.clear();
        recaptchaVerifierRef.current = null;
        recaptchaWidgetIdRef.current = null;
        recaptchaInitRef.current = null;
        throw err;
      }
    })();
    return recaptchaInitRef.current;
  };

  useEffect(() => {
    if (!loading && user) {
      navigate("/owner/onboard", { replace: true });
    }
  }, [loading, navigate, user]);

  useEffect(() => {
    ensureRecaptcha().catch(() => {
      // error already logged in ensureRecaptcha
    });
    return () => {
      recaptchaVerifierRef.current?.clear();
      recaptchaVerifierRef.current = null;
      recaptchaWidgetIdRef.current = null;
      recaptchaInitRef.current = null;
    };
  }, []);

  const sendOtp = async () => {
    setError(null);
    setMessage(null);
    if (!phone || phone.length < 10) {
      setError("Enter a valid phone number with +91 country code.");
      return;
    }
    const verifier = await ensureRecaptcha().catch(() => null);
    if (!verifier) {
      setError("reCAPTCHA unavailable.");
      return;
    }
    setSubmitting(true);
    try {
      const provider = new PhoneAuthProvider(auth);
      const id = await provider.verifyPhoneNumber(phone, verifier);
      setVerificationId(id);
      setMessage("OTP sent to your phone.");
    } catch (err: any) {
      console.error("phone auth error", err, err?.code, err?.message);
      const tokenResponse = err?.customData?._tokenResponse;
      const errorPayload = tokenResponse?.error || tokenResponse;
      if (errorPayload) {
        console.error("identitytoolkit response", errorPayload?.code || err?.customData?.httpStatus, errorPayload);
      }
      setError(err.message || "Failed to send OTP");
    } finally {
      setSubmitting(false);
    }
  };

  const verifyOtp = async () => {
    setError(null);
    setMessage(null);
    if (!verificationId) {
      setError("Send OTP first.");
      return;
    }
    if (!otp) {
      setError("Enter the OTP.");
      return;
    }
    setSubmitting(true);
    try {
      const credential = PhoneAuthProvider.credential(verificationId, otp);
      const result = await signInWithCredential(auth, credential);
      const tokenResult = await result.user.getIdTokenResult(true);
      setAuthToken(tokenResult.token);
      navigate("/owner/onboard", { replace: true });
    } catch (err: any) {
      setError(err.message || "OTP verification failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-md rounded-2xl border bg-surface p-6 shadow-sm space-y-4">
        <div>
          <h1 className="text-xl font-semibold text-primary">Owner Login</h1>
          <p className="text-sm text-secondary">Verify your phone number to continue.</p>
        </div>
        <label className="flex flex-col gap-1 text-sm text-secondary">
          <span className="text-xs text-muted">Phone number (+91)</span>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-md input-glass px-3 py-2"
          />
        </label>
        <button
          type="button"
          onClick={sendOtp}
          disabled={submitting}
          className="w-full rounded-md btn-primary px-3 py-2 text-primary font-semibold disabled:opacity-70"
        >
          {submitting ? "Sending..." : "Send OTP"}
        </button>
        <label className="flex flex-col gap-1 text-sm text-secondary">
          <span className="text-xs text-muted">OTP</span>
          <input
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            className="w-full rounded-md input-glass px-3 py-2"
          />
        </label>
        <button
          type="button"
          onClick={verifyOtp}
          disabled={submitting}
          className="w-full rounded-md bg-indigo-600 px-3 py-2 text-primary font-semibold disabled:opacity-70"
        >
          Verify & Continue
        </button>
        <div id="recaptcha-container" ref={recaptchaRef} />
        {error && <div className="rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</div>}
        {message && (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            {message}
          </div>
        )}
      </div>
    </div>
  );
}





