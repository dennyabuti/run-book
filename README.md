# Run Book

Run Book helps you generate QA test plans and execution artifacts using AI providers plus context from Jira and GitHub pull requests.

## Quick Start

1. Install dependencies:

```bash
yarn install
```

2. Start the app:

```bash
yarn dev
```

3. Open `http://localhost:3000`.

4. Go to **Settings** in the app and add your provider credentials.

## Where Credentials Are Stored

- Credentials are stored in browser local storage by the app (not committed to git by default).
- Use low-privilege, short-lived tokens where possible.
- Do not paste secrets into screenshots, PR descriptions, or shared recordings.

## AI Provider Tokens

Configure these under **Settings → Provider Settings**.

### Gemini

1. Open Google AI Studio: `https://aistudio.google.com/app/apikey`
2. Create an API key.
3. Paste it into **Gemini API key**.
4. Recommended model: `gemini-2.5-pro`.
5. Latest lite model (as of May 2026): `gemini-3.1-flash-lite`.
6. If a model is deprecated or unavailable in your account, pick the latest stable Gemini model shown in AI Studio.

### Anthropic

1. Open Anthropic Console: `https://console.anthropic.com/settings/keys`
2. Create an API key.
3. Paste it into **Anthropic API key**.
4. Recommended model: `claude-3-5-haiku-latest`.

### Ollama (Local Model)

1. Install Ollama:
	- macOS: `brew install ollama`
	- Or download installer: `https://ollama.com/download`
2. Start Ollama service:

```bash
ollama serve
```

3. Pull a model (example):

```bash
ollama pull gemma4
```

4. In app settings:
	- **AI Provider**: `Ollama`
	- **Model name**: `gemma4` (or your installed model)
	- **Ollama base URL**: `http://localhost:11434`

5. Verify locally:

```bash
ollama list
```

## GitHub Token (Personal Access Token)

Used to read private pull request context. Public repos may work without a token.

1. Open token creation page:
	- Fine-grained tokens: `https://github.com/settings/personal-access-tokens/new`
	- Classic tokens: `https://github.com/settings/tokens/new`
2. Grant minimum required access:
	- Public-only repos: `public_repo`
	- Private repos: `repo`
3. Copy token once (GitHub only shows it once).
4. Paste into **Settings → GitHub personal access token**.

## Jira Token (Atlassian API Token)

Used for Jira issue and epic context.

1. Open: `https://id.atlassian.com/manage-profile/security/api-tokens`
2. Create an API token.
3. In app settings, fill:
	- **Jira Base URL**: `https://your-domain.atlassian.net`
	- **Jira email**: your Atlassian account email
	- **Jira API token**: the token you generated

## Confluence Token (Atlassian)

Confluence Cloud uses the same Atlassian API token mechanism as Jira.

1. Open: `https://id.atlassian.com/manage-profile/security/api-tokens`
2. Create a token (or reuse an existing one if your policy allows).
3. Use it with:
	- Your Atlassian email
	- Your Confluence site URL, for example: `https://your-domain.atlassian.net/wiki`

Note: this project currently integrates Jira and GitHub in code. Confluence instructions are included so you can prepare credentials for future integration or external scripts.

## Common Setup Issues

- `401` from GitHub API: token is invalid/expired, or missing required scope.
- `404` from GitHub API on private repo: token missing or lacks access to that repo.
- Jira request failure: wrong base URL, email/token mismatch, or limited project permissions.
- Ollama connection error: ensure `ollama serve` is running and base URL is `http://localhost:11434`.

## Scripts

- `yarn dev` - start local development server
- `yarn build` - production build
- `yarn start` - run production server
- `yarn lint` - run ESLint
- `yarn type-check` - run TypeScript checks
- `yarn test` - run test suite
