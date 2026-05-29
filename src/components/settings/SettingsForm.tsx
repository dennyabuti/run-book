"use client";

import { FormEvent, useEffect, useState } from "react";
import { getSettings, setSettings } from "@/lib/db/client";
import { AppSettings, defaultSettings } from "@/types/domain";

export function SettingsForm() {
  const [settings, setLocalSettings] = useState<AppSettings>(defaultSettings);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    getSettings().then((saved) => setLocalSettings(saved));
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await setSettings(settings);
    setFeedback("Settings saved locally in your browser.");
  }

  return (
    <form className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm" onSubmit={handleSubmit}>
      <h2 className="text-xl font-semibold text-slate-900">Provider Settings</h2>

      <label className="block text-sm text-slate-700">
        Default tester name
        <input
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          value={settings.testerName}
          onChange={(event) => setLocalSettings({ ...settings, testerName: event.target.value })}
          placeholder="Your name — pre-fills the tester name field on each plan"
        />
      </label>

      <label className="block text-sm text-slate-700">
        AI Provider
        <select
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          value={settings.aiProvider}
          onChange={(event) => setLocalSettings({ ...settings, aiProvider: event.target.value as AppSettings["aiProvider"] })}
        >
          <option value="">Select provider</option>
          <option value="gemini">Gemini</option>
          <option value="anthropic">Anthropic</option>
          <option value="ollama">Ollama</option>
        </select>
      </label>

      <label className="block text-sm text-slate-700">
        Model name
        <input
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          value={settings.aiModel}
          onChange={(event) => setLocalSettings({ ...settings, aiModel: event.target.value })}
          placeholder="gemini-2.5-flash, claude-3-5-haiku-latest, or llama3.1:8b"
        />
      </label>

      <label className="block text-sm text-slate-700">
        Ollama base URL
        <input
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          value={settings.ollamaBaseUrl}
          onChange={(event) => setLocalSettings({ ...settings, ollamaBaseUrl: event.target.value })}
          placeholder="http://localhost:11434"
        />
      </label>

      <label className="block text-sm text-slate-700">
        Gemini API key
        <input
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          type="password"
          value={settings.geminiApiKey}
          onChange={(event) => setLocalSettings({ ...settings, geminiApiKey: event.target.value })}
        />
      </label>

      <label className="block text-sm text-slate-700">
        Anthropic API key
        <input
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          type="password"
          value={settings.anthropicApiKey}
          onChange={(event) => setLocalSettings({ ...settings, anthropicApiKey: event.target.value })}
        />
      </label>

      <h3 className="pt-2 text-lg font-semibold text-slate-900">Jira REST Settings</h3>
      <label className="block text-sm text-slate-700">
        Jira Base URL
        <input
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          value={settings.jiraBaseUrl}
          onChange={(event) => setLocalSettings({ ...settings, jiraBaseUrl: event.target.value })}
          placeholder="https://your-domain.atlassian.net"
        />
      </label>

      <label className="block text-sm text-slate-700">
        Jira email
        <input
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          value={settings.jiraEmail}
          onChange={(event) => setLocalSettings({ ...settings, jiraEmail: event.target.value })}
        />
      </label>

      <label className="block text-sm text-slate-700">
        Jira API token
        <input
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          type="password"
          value={settings.jiraApiToken}
          onChange={(event) => setLocalSettings({ ...settings, jiraApiToken: event.target.value })}
        />
        <span className="mt-1 block text-xs text-slate-500">
          Generate a token at{' '}
          <a
            href="https://id.atlassian.com/manage-profile/security/api-tokens"
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 underline hover:text-blue-800"
          >
            id.atlassian.com → Security → API tokens
          </a>
          . Use your Atlassian account email as the &ldquo;Jira email&rdquo; above.
        </span>
      </label>

      <h3 className="pt-2 text-lg font-semibold text-slate-900">GitHub Settings</h3>

      <label className="block text-sm text-slate-700">
        GitHub personal access token
        <input
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          type="password"
          value={settings.githubToken}
          onChange={(event) => setLocalSettings({ ...settings, githubToken: event.target.value })}
        />
        <span className="mt-1 block text-xs text-slate-500">
          Optional for public repositories. Required for private repos.{' '}
          <a
            href="https://github.com/settings/tokens/new?scopes=repo&description=RunBook"
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 underline hover:text-blue-800"
          >
            Generate a token
          </a>{' '}
          with the <code>repo</code> scope (or <code>public_repo</code> for public repos only).
        </span>
      </label>

      <button type="submit" className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
        Save settings
      </button>

      <p className="text-xs text-slate-600">
        Credentials and provider endpoints are stored only in local browser storage. Use low-privilege and short-lived API tokens.
      </p>
      {feedback ? <p className="text-sm text-emerald-700">{feedback}</p> : null}
    </form>
  );
}
