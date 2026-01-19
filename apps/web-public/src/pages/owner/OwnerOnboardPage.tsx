import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../../services/firebase";
import { getTenantMe, ownerOnboard, setAuthToken } from "../../services/apiClient";
import { OWNER_TENANT_ID } from "../../constants/marketplace";
import { useOwnerAuth } from "../../hooks/useOwnerAuth";

type OwnerType = "individual" | "company" | "family_joint" | "";
type ContactPreference = "call" | "whatsapp" | "";
type BestTime = "morning" | "afternoon" | "evening" | "";

export default function OwnerOnboardPage() {
  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState("");
  const [ownerType, setOwnerType] = useState<OwnerType>("");
  const [city, setCity] = useState("Chandrapur");
  const [contactPreference, setContactPreference] = useState<ContactPreference>("");
  const [bestTimeToContact, setBestTimeToContact] = useState<BestTime>("");
  const [alternatePhone, setAlternatePhone] = useState("");
  const [email, setEmail] = useState("");
  const [consentOwner, setConsentOwner] = useState(false);
  const [consentTerms, setConsentTerms] = useState(false);
  const [consentContact, setConsentContact] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { ownerReady, refreshProfile } = useOwnerAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (ownerReady) {
      navigate("/owner/my-listings", { replace: true });
    }
  }, [navigate, ownerReady]);

  const validateStepOne = () => {
    if (!fullName.trim()) return "Full name is required.";
    if (!ownerType) return "Select owner type.";
    if (!city.trim()) return "City is required.";
    return null;
  };

  const validateStepTwo = () => {
    if (!contactPreference) return "Select preferred contact method.";
    if (!bestTimeToContact) return "Select best time to contact.";
    if (alternatePhone.trim() && alternatePhone.trim().length < 8) {
      return "Alternate phone looks too short.";
    }
    if (email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      return "Enter a valid email.";
    }
    return null;
  };

  const validateStepThree = () => {
    if (!consentOwner || !consentTerms || !consentContact) {
      return "Please accept all consent checkboxes.";
    }
    return null;
  };

  const goNext = () => {
    const message = step === 1 ? validateStepOne() : validateStepTwo();
    if (message) {
      setError(message);
      return;
    }
    setError(null);
    setStep((prev) => Math.min(3, prev + 1));
  };

  const goBack = () => {
    setError(null);
    setStep((prev) => Math.max(1, prev - 1));
  };

  const completeOnboarding = async () => {
    setError(null);
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setError("Please verify OTP first.");
      return;
    }
    const stepOneError = validateStepOne();
    if (stepOneError) {
      setStep(1);
      setError(stepOneError);
      return;
    }
    const stepTwoError = validateStepTwo();
    if (stepTwoError) {
      setStep(2);
      setError(stepTwoError);
      return;
    }
    const stepThreeError = validateStepThree();
    if (stepThreeError) {
      setStep(3);
      setError(stepThreeError);
      return;
    }

    setSubmitting(true);
    try {
      const token = await currentUser.getIdToken();
      setAuthToken(token);
      console.log("onboard start");
      const resp = await ownerOnboard(OWNER_TENANT_ID, {
        fullName: fullName.trim(),
        ownerType: ownerType as "individual" | "company" | "family_joint",
        city: city.trim(),
        contactPreference: contactPreference as "call" | "whatsapp",
        bestTimeToContact: bestTimeToContact as "morning" | "afternoon" | "evening",
        alternatePhone: alternatePhone.trim() || undefined,
        email: email.trim() || undefined,
        consentOwner: true,
        consentTerms: true,
        consentContact: true
      });
      console.log("onboard ok", resp);
      const refreshed = await auth.currentUser?.getIdToken(true);
      if (refreshed) {
        setAuthToken(refreshed);
      }
      await getTenantMe(OWNER_TENANT_ID);
      await refreshProfile();
      navigate("/owner/my-listings", { replace: true });
    } catch (err: any) {
      if (err?.status) {
        console.log("onboard failed", err.status, err?.data || err);
      }
      if (err?.code === "PHONE_REQUIRED" || err?.message === "phone_required") {
        setError("Phone verification is required before onboarding.");
      } else {
        setError(err?.message || "Onboarding failed.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const phoneNumber = auth.currentUser?.phoneNumber || "Not available";

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-xl rounded-2xl border bg-surface p-6 shadow-sm space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-primary">Complete Setup</h1>
          <p className="text-sm text-secondary">Step {step} of 3</p>
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <label className="flex flex-col gap-1 text-sm text-secondary">
              <span className="text-xs text-muted">Full name</span>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-md input-glass px-3 py-2"
                placeholder="Your full name"
              />
            </label>
            <div className="space-y-2 text-sm text-secondary">
              <span className="text-xs text-muted">Owner type</span>
              <div className="grid gap-2 sm:grid-cols-3">
                {[
                  { label: "Individual", value: "individual" },
                  { label: "Company", value: "company" },
                  { label: "Family / Joint", value: "family_joint" }
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setOwnerType(option.value as OwnerType)}
                    className={`rounded-md border px-3 py-2 text-sm ${
                      ownerType === option.value ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-theme"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex flex-col gap-1 text-sm text-secondary">
              <span className="text-xs text-muted">City</span>
              <input
                value={city}
                readOnly
                onChange={(e) => setCity(e.target.value)}
                className="w-full rounded-md input-glass bg-surface px-3 py-2 text-secondary"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-secondary">
              <span className="text-xs text-muted">Phone number</span>
              <input
                value={phoneNumber}
                readOnly
                className="w-full rounded-md input-glass bg-surface px-3 py-2 text-secondary"
              />
            </label>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-2 text-sm text-secondary">
              <span className="text-xs text-muted">Preferred contact method</span>
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  { label: "Call", value: "call" },
                  { label: "WhatsApp", value: "whatsapp" }
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setContactPreference(option.value as ContactPreference)}
                    className={`rounded-md border px-3 py-2 text-sm ${
                      contactPreference === option.value
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                        : "border-theme"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2 text-sm text-secondary">
              <span className="text-xs text-muted">Best time to contact</span>
              <div className="grid gap-2 sm:grid-cols-3">
                {[
                  { label: "Morning (9-12)", value: "morning" },
                  { label: "Afternoon (12-4)", value: "afternoon" },
                  { label: "Evening (4-8)", value: "evening" }
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setBestTimeToContact(option.value as BestTime)}
                    className={`rounded-md border px-3 py-2 text-sm ${
                      bestTimeToContact === option.value
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                        : "border-theme"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex flex-col gap-1 text-sm text-secondary">
              <span className="text-xs text-muted">Alternate phone (optional)</span>
              <input
                value={alternatePhone}
                onChange={(e) => setAlternatePhone(e.target.value)}
                className="w-full rounded-md input-glass px-3 py-2"
                placeholder="+91"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-secondary">
              <span className="text-xs text-muted">Email (optional)</span>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md input-glass px-3 py-2"
                placeholder="name@example.com"
              />
            </label>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 text-sm text-secondary">
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={consentOwner}
                onChange={(e) => setConsentOwner(e.target.checked)}
                className="mt-1"
              />
              <span>I confirm I am the owner / authorized representative</span>
            </label>
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={consentTerms}
                onChange={(e) => setConsentTerms(e.target.checked)}
                className="mt-1"
              />
              <span>I agree to Terms &amp; Privacy Policy</span>
            </label>
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={consentContact}
                onChange={(e) => setConsentContact(e.target.checked)}
                className="mt-1"
              />
              <span>I allow ChandaNest / brokerage partner to contact me regarding this property</span>
            </label>
          </div>
        )}

        {error && <div className="rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</div>}

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={goBack}
            disabled={step === 1 || submitting}
            className="rounded-md input-glass px-4 py-2 text-sm text-secondary disabled:opacity-50"
          >
            Back
          </button>
          {step < 3 ? (
            <button
              type="button"
              onClick={goNext}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-primary"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={completeOnboarding}
              disabled={submitting}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-primary disabled:opacity-70"
            >
              Complete Setup
            </button>
          )}
        </div>
      </div>
    </div>
  );
}





