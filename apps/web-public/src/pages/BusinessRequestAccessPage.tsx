import React from "react";

export default function BusinessRequestAccessPage() {
  const [submitted, setSubmitted] = React.useState(false);
  const [form, setForm] = React.useState({
    orgType: "agency",
    orgName: "",
    city: "",
    phone: "",
    email: "",
    message: "",
  });

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <div className="rounded-2xl card-glass border border-theme bg-surface p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-primary">Business Access Request</h1>
        <p className="mt-2 text-sm text-secondary">
          If you are an agency or builder, share your details and our team will contact you to onboard your organization.
        </p>

        {submitted ? (
          <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Thanks! We will contact you shortly.
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-secondary">Organization type</label>
              <select
                name="orgType"
                value={form.orgType}
                onChange={onChange}
                className="mt-1 w-full rounded-lg input-glass px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              >
                <option value="agency">Agency / Broker</option>
                <option value="enterprise">Enterprise / Builder</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary">Organization name</label>
              <input
                name="orgName"
                value={form.orgName}
                onChange={onChange}
                className="mt-1 w-full rounded-lg input-glass px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-secondary">City</label>
                <input
                  name="city"
                  value={form.city}
                  onChange={onChange}
                  className="mt-1 w-full rounded-lg input-glass px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary">Phone</label>
                <input
                  name="phone"
                  value={form.phone}
                  onChange={onChange}
                  className="mt-1 w-full rounded-lg input-glass px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary">Email</label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={onChange}
                className="mt-1 w-full rounded-lg input-glass px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary">Message</label>
              <textarea
                name="message"
                value={form.message}
                onChange={onChange}
                rows={4}
                className="mt-1 w-full rounded-lg input-glass px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
            >
              Submit request
            </button>
          </form>
        )}
      </div>
    </div>
  );
}



