import { SettingsForm } from "@/components/settings/SettingsForm";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
      <p className="text-sm text-slate-600">Configure AI provider and Jira access for this browser only.</p>
      <SettingsForm />
    </section>
  );
}
