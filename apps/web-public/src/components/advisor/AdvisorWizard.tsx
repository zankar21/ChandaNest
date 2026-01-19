import { useMemo, useState } from "react";
import { TARGET_CITIES, TARGET_CITY_SLUGS, isTargetCitySlug } from "../../constants/market";
import { createBuyerRequest } from "../../services/buyerRequests";
import ConsentStep from "./steps/ConsentStep";
import CityStep from "./steps/CityStep";
import IntentStep from "./steps/IntentStep";
import PropertyStep from "./steps/PropertyStep";
import BudgetStep from "./steps/BudgetStep";
import PreferencesStep from "./steps/PreferencesStep";
import ContactStep from "./steps/ContactStep";
import ReviewStep from "./steps/ReviewStep";

type WizardState = {
  consent: { granted: boolean; partnerShare: boolean };
  citySlug: string;
  intent: Intent | "";
  property: { category: string; type: string; bhk?: number };
  budget: { min?: number; max?: number };
  localityText: string;
  mustHaves: string[];
  dealBreakers: string[];
  buyer: { name?: string; phone: string; preferredCallTime?: string };
};

const CATEGORY_OPTIONS = ["residential", "commercial", "land", "other"] as const;
const TYPE_OPTIONS = ["apartment", "villa", "plot", "office", "shop", "warehouse", "other"] as const;
const DEFAULT_LAND_TYPE = "plot";
type Intent = "buy" | "rent" | "invest" | "lease" | "other";

type Props = { initialCitySlug?: string };

export default function AdvisorWizard({ initialCitySlug }: Props) {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [state, setState] = useState<WizardState>({
    consent: { granted: false, partnerShare: true },
    citySlug: initialCitySlug || "",
    intent: "",
    property: { category: "", type: "" },
    budget: {},
    localityText: "",
    mustHaves: [],
    dealBreakers: [],
    buyer: { name: "", phone: "", preferredCallTime: "" }
  });

  const steps = useMemo(
    () => [
      "Consent",
      "City",
      "Intent",
      "Property",
      "Budget",
      "Preferences",
      "Contact",
      "Review"
    ],
    []
  );

  const isPhoneValid = (phone: string) => /^\d{10,}$/.test(phone);

  const validateStep = (current: number): string | null => {
    const s = state;
    switch (current) {
      case 0:
        return s.consent.granted ? null : "Consent is required to proceed.";
      case 1:
        return isTargetCitySlug(s.citySlug) ? null : "Select a city.";
      case 2:
        return s.intent ? null : "Select your intent.";
      case 3:
        if (!s.property.category) return "Select a category.";
        if (!s.property.type) return "Select a property type.";
        return null;
      case 4:
        if (s.budget.min !== undefined && s.budget.max !== undefined && s.budget.min > s.budget.max) {
          return "Budget min cannot exceed max.";
        }
        return null;
      case 5:
        return s.localityText ? null : "Add preferred locality.";
      case 6:
        return isPhoneValid(s.buyer.phone) ? null : "Valid phone is required.";
      default:
        return null;
    }
  };

  const skipCity = Boolean(initialCitySlug);

  const goNext = () => {
    const err = validateStep(step);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setStep((s) => {
      let next = Math.min(s + 1, steps.length - 1);
      if (next === 1 && skipCity) next = 2;
      return next;
    });
  };

  const goBack = () => {
    setError(null);
    setStep((s) => {
      let prev = Math.max(s - 1, 0);
      if (prev === 1 && skipCity) prev = 0;
      return prev;
    });
  };

  const handleSubmit = async () => {
    const err = validateStep(step);
    if (err) {
      setError(err);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        citySlug: state.citySlug,
        intent: state.intent as Intent,
        property: {
          category: state.property.category,
          type: state.property.category === "land" ? DEFAULT_LAND_TYPE : state.property.type,
          bhk: state.property.bhk
        },
        budget: {
          currency: "INR",
          min: state.budget.min,
          max: state.budget.max
        },
        localityText: state.localityText,
        mustHaves: state.mustHaves,
        dealBreakers: state.dealBreakers,
        consent: {
          granted: true as const,
          partnerShare: state.consent.partnerShare,
          at: new Date().toISOString()
        },
        buyer: {
          name: state.buyer.name || "",
          phone: state.buyer.phone,
          preferredCallTime: state.buyer.preferredCallTime
        }
      };
      const resp = await createBuyerRequest(payload);
      setSuccessId(resp.requestId);
    } catch (e: any) {
      setError(e?.message || "Failed to submit request.");
    } finally {
      setSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <ConsentStep
            value={state.consent}
            onChange={(v) => setState((prev) => ({ ...prev, consent: v }))}
          />
        );
      case 1:
        return (
          <CityStep
            value={state.citySlug}
            onChange={(v) => setState((prev) => ({ ...prev, citySlug: v }))}
          />
        );
      case 2:
        return <IntentStep value={state.intent} onChange={(v) => setState((p) => ({ ...p, intent: v }))} />;
      case 3:
        return (
          <PropertyStep
            category={state.property.category}
            type={state.property.type}
            bhk={state.property.bhk}
            categories={CATEGORY_OPTIONS}
            types={TYPE_OPTIONS}
            onChange={(next) => setState((p) => ({ ...p, property: next }))}
          />
        );
      case 4:
        return (
          <BudgetStep
            budget={state.budget}
            onChange={(budget) => setState((p) => ({ ...p, budget }))}
          />
        );
      case 5:
        return (
          <PreferencesStep
            localityText={state.localityText}
            mustHaves={state.mustHaves}
            dealBreakers={state.dealBreakers}
            onChange={(next) => setState((p) => ({ ...p, ...next }))}
          />
        );
      case 6:
        return (
          <ContactStep
            buyer={state.buyer}
            onChange={(buyer) => setState((p) => ({ ...p, buyer }))}
          />
        );
      case 7:
        return (
          <ReviewStep
            state={state}
            cityLabel={TARGET_CITIES[state.citySlug as keyof typeof TARGET_CITIES]?.name}
          />
        );
      default:
        return null;
    }
  };

  if (successId) {
    return (
      <div className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50 p-6">
        <h2 className="text-xl font-semibold text-emerald-800">Request submitted</h2>
        <p className="text-sm text-emerald-700">
          Thank you. Our advisor will reach out soon. Reference ID: <strong>{successId}</strong>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm uppercase text-indigo-600 font-semibold">Buyer Advisor</div>
          <h1 className="text-2xl font-bold text-primary">Tell us what you need</h1>
        </div>
        <div className="text-sm text-muted">
          Step {step + 1} of {steps.length}
        </div>
      </div>

      <div className="rounded-xl card-glass border border-theme bg-surface p-4 shadow-sm space-y-4">
        <div>{renderStep()}</div>
        {error && <div className="rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</div>}
        <div className="flex justify-between">
          <button
            onClick={goBack}
            disabled={step === 0 || submitting}
            className="rounded-md input-glass px-4 py-2 text-sm font-semibold text-primary disabled:opacity-50"
          >
            Back
          </button>
          {step < steps.length - 1 ? (
            <button
              onClick={goNext}
              disabled={submitting}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
            >
              {submitting ? "Submitting..." : "Submit"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}





