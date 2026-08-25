import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  Check,
  GitBranch,
  ListChecks,
  Loader2,
  Pencil,
  RefreshCw,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { planTasks } from "@/lib/ai.functions";

const searchSchema = z.object({ seed: z.string().optional() });

export const Route = createFileRoute("/tasks")({
  validateSearch: (search: Record<string, unknown>) => searchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "AI Task Planner — Cadence AI Assistant" },
      {
        name: "description",
        content:
          "Turn goals and action items into prioritised tasks with subtasks, effort estimates, dependencies, and a daily or weekly plan.",
      },
      { property: "og:title", content: "AI Task Planner — Cadence AI Assistant" },
      {
        property: "og:description",
        content: "Break big goals into ordered, prioritised tasks with deadlines and dependencies.",
      },
    ],
  }),
  component: TasksPage,
});

type PlanResult = Awaited<ReturnType<typeof planTasks>>;

type Task = PlanResult["tasks"][number] & { id: string; done: boolean };

const STORAGE_KEY = "cadence.tasks.v1";

function priorityStyle(priority: string) {
  const p = priority.toLowerCase();
  if (p.startsWith("high")) return "border-destructive/40 bg-destructive/10 text-destructive";
  if (p.startsWith("low")) return "border-border bg-secondary text-muted-foreground";
  return "border-warning/50 bg-warning/15 text-warning-foreground";
}

function TasksPage() {
  const { seed } = Route.useSearch();
  const run = useServerFn(planTasks);
  const [goal, setGoal] = useState(seed ?? "");
  const [horizon, setHorizon] = useState<"daily" | "weekly">("weekly");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [schedule, setSchedule] = useState<PlanResult["schedule"]>([]);
  const [planSummary, setPlanSummary] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setTasks(parsed.tasks ?? []);
        setSchedule(parsed.schedule ?? []);
        setPlanSummary(parsed.planSummary ?? "");
      }
    } catch {
      /* ignore corrupted local state */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ tasks, schedule, planSummary }));
  }, [tasks, schedule, planSummary, hydrated]);

  const mutation = useMutation({
    mutationFn: () => run({ data: { goal, horizon } }),
    onSuccess: (result) => {
      setTasks(
        result.tasks
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((t, i) => ({
            ...t,
            id: `${Date.now()}-${i}`,
            done: false,
          })),
      );
      setSchedule(result.schedule ?? []);
      setPlanSummary(result.planSummary);
      toast.success("Plan ready");
    },
  });

  const submit = () => {
    if (!goal.trim()) {
      toast.error("Describe a goal or paste some action items first.");
      return;
    }
    mutation.mutate();
  };

  const update = (id: string, patch: Partial<Task>) =>
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));

  const remaining = tasks.filter((t) => !t.done).length;

  return (
    <AppShell
      title="AI Task Planner"
      description="Give Cadence a goal, a messy brain dump, or the action items from a meeting. It returns ordered tasks with priorities, effort, deadlines, and dependencies."
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        <section className="panel h-fit space-y-4 p-5">
          <div className="space-y-2">
            <Label htmlFor="goal">Goal, action items, or instructions</Label>
            <Textarea
              id="goal"
              rows={9}
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g. Launch the new pricing page by the end of the month, including copy review, design QA and analytics tracking"
            />
          </div>

          <div className="space-y-2">
            <Label>Plan horizon</Label>
            <div className="flex gap-2">
              {(["daily", "weekly"] as const).map((h) => (
                <button
                  key={h}
                  type="button"
                  aria-pressed={horizon === h}
                  onClick={() => setHorizon(h)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium capitalize transition-colors ${
                    horizon === h
                      ? "border-accent bg-accent text-accent-foreground"
                      : "border-border bg-card text-muted-foreground hover:border-accent/50"
                  }`}
                >
                  {h} plan
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button className="flex-1" onClick={submit} disabled={mutation.isPending}>
              {mutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Planning…
                </>
              ) : (
                <>
                  <Sparkles className="size-4" /> Generate plan
                </>
              )}
            </Button>
            {tasks.length > 0 && (
              <Button variant="outline" onClick={submit} disabled={mutation.isPending}>
                <RefreshCw className={`size-4 ${mutation.isPending ? "animate-spin" : ""}`} />
              </Button>
            )}
          </div>

          {tasks.length > 0 && (
            <div className="border-border text-muted-foreground flex items-center justify-between border-t pt-4 text-xs">
              <span>
                {remaining} of {tasks.length} remaining
              </span>
              <button
                className="hover:text-destructive transition-colors"
                onClick={() => {
                  setTasks([]);
                  setSchedule([]);
                  setPlanSummary("");
                }}
              >
                Clear plan
              </button>
            </div>
          )}
        </section>

        <section className="space-y-4">
          {mutation.isError && (
            <div className="border-destructive/40 bg-destructive/10 text-destructive flex gap-3 rounded-xl border p-4 text-sm">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <div>
                <p className="font-medium">Planning failed</p>
                <p className="opacity-90">{(mutation.error as Error).message}</p>
              </div>
            </div>
          )}

          {mutation.isPending && tasks.length === 0 ? (
            <div className="space-y-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="panel space-y-3 p-5">
                  <Skeleton className="h-5 w-1/2" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
              ))}
            </div>
          ) : tasks.length > 0 ? (
            <>
              {planSummary && (
                <div className="panel p-5">
                  <h2 className="mb-2 text-sm font-semibold tracking-wide uppercase">
                    Plan overview
                  </h2>
                  <p className="text-sm leading-relaxed">{planSummary}</p>
                </div>
              )}

              <div className="space-y-3">
                {tasks.map((task, index) => (
                  <article
                    key={task.id}
                    className={`panel p-5 transition-opacity ${task.done ? "opacity-60" : ""}`}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={task.done}
                        onCheckedChange={(v) => update(task.id, { done: Boolean(v) })}
                        aria-label={`Mark "${task.title}" complete`}
                        className="mt-1"
                      />
                      <div className="min-w-0 flex-1 space-y-2">
                        {editingId === task.id ? (
                          <div className="space-y-2">
                            <Input
                              value={task.title}
                              onChange={(e) => update(task.id, { title: e.target.value })}
                            />
                            <Textarea
                              rows={3}
                              value={task.details}
                              onChange={(e) => update(task.id, { details: e.target.value })}
                            />
                            <div className="grid gap-2 sm:grid-cols-3">
                              <Input
                                value={task.priority}
                                onChange={(e) => update(task.id, { priority: e.target.value })}
                                placeholder="priority"
                              />
                              <Input
                                value={task.effort}
                                onChange={(e) => update(task.id, { effort: e.target.value })}
                                placeholder="effort"
                              />
                              <Input
                                type="date"
                                value={task.dueDate}
                                onChange={(e) => update(task.id, { dueDate: e.target.value })}
                              />
                            </div>
                            <Button size="sm" onClick={() => setEditingId(null)}>
                              <Check className="size-4" /> Done editing
                            </Button>
                          </div>
                        ) : (
                          <>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-muted-foreground font-display text-xs">
                                #{index + 1}
                              </span>
                              <h3
                                className={`text-base font-semibold ${task.done ? "line-through" : ""}`}
                              >
                                {task.title}
                              </h3>
                            </div>
                            {task.details && (
                              <p className="text-muted-foreground text-sm">{task.details}</p>
                            )}
                            {task.subtasks?.length > 0 && (
                              <ul className="border-border mt-2 space-y-1.5 border-l pl-4 text-sm">
                                {task.subtasks.map((s) => (
                                  <li key={s} className="text-muted-foreground">
                                    {s}
                                  </li>
                                ))}
                              </ul>
                            )}
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                              <span
                                className={`rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${priorityStyle(task.priority)}`}
                              >
                                {task.priority || "medium"}
                              </span>
                              {task.effort && <Badge variant="secondary">{task.effort}</Badge>}
                              {task.dueDate && (
                                <Badge variant="outline" className="gap-1">
                                  <CalendarDays className="size-3" />
                                  {task.dueDate}
                                </Badge>
                              )}
                              {task.dependsOn?.length > 0 && (
                                <Badge variant="outline" className="gap-1">
                                  <GitBranch className="size-3" />
                                  after {task.dependsOn.join(", ")}
                                </Badge>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Edit task"
                          onClick={() => setEditingId(editingId === task.id ? null : task.id)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Delete task"
                          onClick={() => setTasks((prev) => prev.filter((t) => t.id !== task.id))}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              {schedule.length > 0 && (
                <div className="panel p-5">
                  <h2 className="mb-4 text-sm font-semibold tracking-wide uppercase">
                    Suggested {horizon} plan
                  </h2>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {schedule.map((block) => (
                      <div key={block.label} className="border-border rounded-lg border p-4">
                        <p className="font-display mb-2 text-sm font-semibold">{block.label}</p>
                        <ul className="text-muted-foreground space-y-1.5 text-sm">
                          {block.items.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="panel flex flex-col items-center justify-center px-6 py-20 text-center">
              <span className="bg-secondary text-muted-foreground flex size-12 items-center justify-center rounded-xl">
                <ListChecks className="size-6" />
              </span>
              <h2 className="mt-4 text-lg font-semibold">No plan yet</h2>
              <p className="text-muted-foreground mt-1 max-w-sm text-sm">
                Describe a goal on the left. Cadence breaks it into ordered tasks you can complete,
                edit, reschedule, or regenerate.
              </p>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
