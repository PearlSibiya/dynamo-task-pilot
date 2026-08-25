import { generateText, Output, NoObjectGeneratedError } from "ai";
import { z } from "zod";
import { getGateway, CHAT_MODEL } from "./ai-gateway.server";

const str = z.string().nullish();
const strArr = z.array(z.string()).nullish();

const emailSchema = z.object({
  subject: str,
  body: str,
  notes: strArr,
});

const notesSchema = z.object({
  quickSummary: str,
  detailedSummary: str,
  keyTopics: strArr,
  decisions: strArr,
  questions: strArr,
  openIssues: strArr,
  actionItems: z
    .array(
      z.object({
        task: str,
        owner: str,
        deadline: str,
      }),
    )
    .nullish(),
});

const planSchema = z.object({
  planSummary: str,
  tasks: z
    .array(
      z.object({
        title: str,
        details: str,
        priority: str,
        effort: str,
        dueDate: str,
        order: z.number().nullish(),
        dependsOn: strArr,
        subtasks: strArr,
      }),
    )
    .nullish(),
  schedule: z
    .array(
      z.object({
        label: str,
        items: strArr,
      }),
    )
    .nullish(),
});

const s = (v: string | null | undefined) => (typeof v === "string" ? v.trim() : "");
const list = (v: (string | null | undefined)[] | null | undefined) =>
  (v ?? []).map(s).filter(Boolean);

async function run<T>(schema: z.ZodType<T>, system: string, prompt: string): Promise<T> {
  const gateway = getGateway();
  try {
    const { output } = await generateText({
      model: gateway(CHAT_MODEL),
      output: Output.object({ schema }),
      system,
      prompt,
    });
    return output as T;
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error) && error.text) {
      const match = error.text.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          return schema.parse(JSON.parse(match[0]));
        } catch {
          /* fall through to rethrow */
        }
      }
    }
    throw new Error(
      error instanceof Error
        ? `AI request failed: ${error.message}`
        : "AI request failed. Please try again.",
    );
  }
}

export async function runEmail(data: {
  instruction: string;
  tone: string;
  recipient?: string | undefined;
  sender?: string | undefined;
  previous?: string | undefined;
}) {
  const out = await run(
    emailSchema,
    "You are an expert business writing assistant. Write clear, well-structured emails that preserve the user's intent exactly while improving grammar, clarity and structure. Never invent facts, commitments, or numbers — use [placeholders] when information is missing. Always fill every field: subject, body, and notes (1-3 short writing tips or assumptions you made).",
    [
      `Tone: ${data.tone}`,
      data.recipient ? `Recipient: ${data.recipient}` : "",
      data.sender ? `Sender / sign-off: ${data.sender}` : "",
      data.previous
        ? `This is a regeneration. Produce a meaningfully different version than the previous draft below:\n${data.previous}`
        : "",
      `Instruction: ${data.instruction}`,
      "Return a suggested subject line and the full email body including greeting and sign-off.",
    ]
      .filter(Boolean)
      .join("\n\n"),
  );

  return {
    subject: s(out.subject) || "(no subject suggested)",
    body: s(out.body),
    notes: list(out.notes),
  };
}

export async function runNotes(data: { transcript: string }) {
  const out = await run(
    notesSchema,
    "You summarize meeting transcripts and notes. Be faithful to the source: only list decisions, questions, owners and deadlines explicitly present. If an owner or deadline is not stated, use an empty string. quickSummary is 2-3 sentences; detailedSummary is a structured multi-paragraph rundown. Always include every field, using empty arrays when nothing applies.",
    `Summarize the following meeting content:\n\n${data.transcript}`,
  );

  return {
    quickSummary: s(out.quickSummary),
    detailedSummary: s(out.detailedSummary),
    keyTopics: list(out.keyTopics),
    decisions: list(out.decisions),
    questions: list(out.questions),
    openIssues: list(out.openIssues),
    actionItems: (out.actionItems ?? [])
      .map((a) => ({ task: s(a.task), owner: s(a.owner), deadline: s(a.deadline) }))
      .filter((a) => a.task),
  };
}

export async function runPlan(data: { goal: string; horizon: string }) {
  const out = await run(
    planSchema,
    "You are a planning assistant. Turn goals or action items into an ordered, actionable task list. Always fill every field of every task. priority is high, medium or low. effort is a short estimate such as '30m' or '2h'. dueDate is an ISO date (YYYY-MM-DD), or an empty string if unknowable. order starts at 1. dependsOn lists titles of tasks that must be done first (empty array if none). subtasks break larger tasks into concrete steps. schedule groups task titles into a realistic day-by-day or week-by-week plan based on priority and deadlines, each block having a label and items.",
    `Today is ${new Date().toISOString().slice(0, 10)}. Build a ${data.horizon} plan.\n\nGoals / action items / instructions:\n${data.goal}`,
  );

  return {
    planSummary: s(out.planSummary),
    tasks: (out.tasks ?? [])
      .map((t, i) => ({
        title: s(t.title),
        details: s(t.details),
        priority: s(t.priority).toLowerCase() || "medium",
        effort: s(t.effort),
        dueDate: s(t.dueDate),
        order: typeof t.order === "number" ? t.order : i + 1,
        dependsOn: list(t.dependsOn),
        subtasks: list(t.subtasks),
      }))
      .filter((t) => t.title),
    schedule: (out.schedule ?? [])
      .map((b) => ({ label: s(b.label), items: list(b.items) }))
      .filter((b) => b.label && b.items.length > 0),
  };
}
