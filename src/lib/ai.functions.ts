import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const EmailInput = z.object({
  instruction: z.string().min(1),
  tone: z.enum(["professional", "friendly", "concise", "persuasive", "formal"]),
  recipient: z.string().optional(),
  sender: z.string().optional(),
  previous: z.string().optional(),
});

const NotesInput = z.object({
  transcript: z.string().min(1),
});

const PlanInput = z.object({
  goal: z.string().min(1),
  horizon: z.enum(["daily", "weekly"]),
});

export const generateEmail = createServerFn({ method: "POST" })
  .validator((input: unknown) => EmailInput.parse(input))
  .handler(async ({ data }) => {
    const { runEmail } = await import("./ai.server");
    return runEmail(data);
  });

export const summarizeNotes = createServerFn({ method: "POST" })
  .validator((input: unknown) => NotesInput.parse(input))
  .handler(async ({ data }) => {
    const { runNotes } = await import("./ai.server");
    return runNotes(data);
  });

export const planTasks = createServerFn({ method: "POST" })
  .validator((input: unknown) => PlanInput.parse(input))
  .handler(async ({ data }) => {
    const { runPlan } = await import("./ai.server");
    return runPlan(data);
  });
