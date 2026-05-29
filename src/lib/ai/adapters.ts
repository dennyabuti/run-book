import { ChatAnthropic } from "@langchain/anthropic";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatOllama } from "@langchain/ollama";
import { TestCase, TestPlan } from "@/types/domain";

export interface AiGenerateInput {
  description: string;
  planType: TestPlan["type"];
  jiraContext: string;
  githubContext: string;
}

export interface AiClient {
  generateTestCases(input: AiGenerateInput): Promise<TestCase[]>;
}

const JSON_PROMPT = `You are a senior QA analyst. Generate test cases as JSON only.
Output format must be an array where each item contains:
- title
- description
- preconditions
- steps: [{ action, expectedOutcome }]
- expectedResult
- severity (Critical|High|Medium|Low)
No markdown, no prose, only strict JSON.`;

function parseCases(raw: string): TestCase[] {
  const cleaned = raw.trim().replace(/^```json/, "").replace(/```$/, "");
  const parsed = JSON.parse(cleaned) as Array<{
    title: string;
    description: string;
    preconditions: string;
    steps: Array<{ action: string; expectedOutcome: string }>;
    expectedResult: string;
    severity: TestCase["severity"];
  }>;

  return parsed.map((item, idx) => ({
    id: `ai_case_${idx}_${Date.now()}`,
    title: item.title,
    description: item.description,
    preconditions: item.preconditions,
    steps: item.steps.map((step, stepIdx) => ({
      id: `ai_step_${idx}_${stepIdx}_${Date.now()}`,
      action: step.action,
      expectedOutcome: step.expectedOutcome,
      status: "Untested",
      notes: "",
    })),
    expectedResult: item.expectedResult,
    actualResult: "",
    status: "Untested",
    severity: item.severity,
    notes: "",
    attachments: "",
  }));
}

export class GeminiClient implements AiClient {
  constructor(private readonly apiKey: string, private readonly model: string) {}

  async generateTestCases(input: AiGenerateInput): Promise<TestCase[]> {
    const llm = new ChatGoogleGenerativeAI({
      apiKey: this.apiKey,
      model: this.model || "gemini-2.5-flash",
      temperature: 0.2,
    });

    const response = await llm.invoke([
      { role: "system", content: JSON_PROMPT },
      {
        role: "user",
        content: `Type: ${input.planType}\nFeature: ${input.description}\nJira: ${input.jiraContext}\nGitHub PR: ${input.githubContext}`,
      },
    ]);

    return parseCases(String(response.content));
  }
}

export class AnthropicClient implements AiClient {
  constructor(private readonly apiKey: string, private readonly model: string) {}

  async generateTestCases(input: AiGenerateInput): Promise<TestCase[]> {
    const llm = new ChatAnthropic({
      apiKey: this.apiKey,
      model: this.model || "claude-3-5-haiku-latest",
      temperature: 0.2,
    });

    const response = await llm.invoke([
      { role: "system", content: JSON_PROMPT },
      {
        role: "user",
        content: `Type: ${input.planType}\nFeature: ${input.description}\nJira: ${input.jiraContext}\nGitHub PR: ${input.githubContext}`,
      },
    ]);

    return parseCases(String(response.content));
  }
}

export class OllamaClient implements AiClient {
  constructor(private readonly baseUrl: string, private readonly model: string) {}

  async generateTestCases(input: AiGenerateInput): Promise<TestCase[]> {
    const llm = new ChatOllama({
      baseUrl: this.baseUrl || "http://localhost:11434",
      model: this.model || "llama3.1:8b",
      temperature: 0.2,
    });

    const response = await llm.invoke([
      { role: "system", content: JSON_PROMPT },
      {
        role: "user",
        content: `Type: ${input.planType}\nFeature: ${input.description}\nJira: ${input.jiraContext}\nGitHub PR: ${input.githubContext}`,
      },
    ]);

    return parseCases(String(response.content));
  }
}
