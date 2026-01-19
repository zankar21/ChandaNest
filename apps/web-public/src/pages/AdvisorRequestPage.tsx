import AdvisorWizard from "../components/advisor/AdvisorWizard";
import { useSearchParams } from "react-router-dom";
import { isTargetCitySlug } from "../constants/market";

export default function AdvisorRequestPage() {
  const [searchParams] = useSearchParams();
  const cityParam = searchParams.get("city");
  const initialCitySlug = cityParam && isTargetCitySlug(cityParam) ? cityParam : undefined;
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <AdvisorWizard initialCitySlug={initialCitySlug} />
    </div>
  );
}



