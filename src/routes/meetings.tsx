import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Copy,
  Loader2,
  NotebookPen,
  RefreshCw,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { summarizeNotes } from "@/lib/ai.functions";

export const Route = createFileRoute("/meetings")({
  head: () => ({
    meta: [
      { title: "Meeting Notes Summarizer — Cadence AI Assistant" },
      {
        name: "description",
        content:
          "Paste or upload a transcript and get quick and detailed summaries, decisions, open questions, and action items with owners and deadlines.",
      },
      { property: "og:title", content: "Meeting Notes Summarizer — Cadence AI Assistant" },
      {
        property: "og:description",
        content:
          "Turn messy meeting transcripts into decisions, open issues, and owned action items.",
      },
    ],
  }),
  component: MeetingsPage,
});

type Summary = Awaited<ReturnType<typeof summarizeNotes>>;

function List({ items, empty }: { items: string[]; empty: string }) {
  if (!items?.length) return <p className="text-muted-foreground text-sm">{empty}</p>;
  return (
    <ul className="space-y-2 text-sm">
      {items.map((item) => (
        <li key={item} className="flex gap-2.5">
          <span className="bg-accent mt-1.5 size-1.5 shrink-0 rounded-full" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function MeetingsPage() {
  const run = useServerFn(summarizeNotes);
  const [transcript, setTranscript] = useState("");
  const [result, setResult] = useState<Summary | null>(null);
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const mutation = useMutation({
    mutationFn: () => run({ data: { transcript } }),
    onSuccess: setResult,
  });

  const submit = () => {
    if (transcript.trim().length < 20) {
      toast.error("Paste a bit more of the meeting content to summarize.");
      return;
    }
    mutation.mutate();
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 1_500_000) {
      toast.error("That file is a bit large — try under 1.5 MB of text.");
      return;
    }
    const text = await file.text();
    setTranscript(text);
    toast.success(`Loaded ${file.name}`);
  };

  const copyAll = async () => {
    if (!result) return;
    const text = [
      `Quick summary\n${result.quickSummary}`,
      `\nDetailed summary\n${result.detailedSummary}`,
      `\nDecisions\n${result.decisions.map((d) => `- ${d}`).join("\n")}`,
      `\nAction items\n${result.actionItems
        .map(
          (a) =>
            `- ${a.task}${a.owner ? ` (owner: ${a.owner})` : ""}${a.deadline ? ` — due ${a.deadline}` : ""}`,
        )
        .join("\n")}`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
      toast.success("Summary copied");
    } catch {
      toast.error("Couldn't copy to clipboard");
    }
  };

  const actionItemsText =
    result?.actionItems
      .map(
        (a) =>
          `${a.task}${a.owner ? ` (owner: ${a.owner})` : ""}${a.deadline ? ` — due ${a.deadline}` : ""}`,
      )
      .join("\n") ?? "";

  return (
    <AppShell
      title="Meeting Notes Summarizer"
      description="Drop in a transcript, rough notes, or a wall of pasted text. Cadence pulls out what was decided, what's still open, and who owes what."
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        <section className="panel h-fit space-y-4 p-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="transcript">Transcript or notes</Label>
              <Button variant="ghost" size="sm" onClick={() => fileRef.current?.click()}>
                <Upload className="size-4" /> Upload .txt / .md
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept=".txt,.md,.markdown,.csv,.vtt,text/plain"
                className="hidden"
                onChange={(e) => onFile(e.target.files?.[0])}
              />
            </div>
            <Textarea
              id="transcript"
              rows={16}
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder={
                "Paste the meeting transcript or your raw notes here…\n\ne.g. Sam: we agreed to ship the pricing page on the 12th. Priya to confirm copy with legal by Friday."
              }
            />
            <p className="text-muted-foreground text-xs">
              {transcript.trim() ? `${transcript.trim().split(/\s+/).length} words` : "No text yet"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={submit} disabled={mutation.isPending}>
              {mutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Summarizing…
                </>
              ) : (
                <>
                  <NotebookPen className="size-4" /> Summarize
                </>
              )}
            </Button>
            {result && (
              <Button
                variant="outline"
                onClick={() => mutation.mutate()}
                disabled={mutation.isPending}
              >
                <RefreshCw className={`size-4 ${mutation.isPending ? "animate-spin" : ""}`} />
              </Button>
            )}
          </div>
        </section>

        <section className="space-y-4">
          {mutation.isError && (
            <div className="border-destructive/40 bg-destructive/10 text-destructive flex gap-3 rounded-xl border p-4 text-sm">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <div>
                <p className="font-medium">Summarizing failed</p>
                <p className="opacity-90">{(mutation.error as Error).message}</p>
              </div>
            </div>
          )}

          {mutation.isPending && !result ? (
            <div className="panel space-y-4 p-5">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : result ? (
            <>
              <div className="panel p-5">
                <Tabs defaultValue="quick">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <TabsList>
                      <TabsTrigger value="quick">Quick</TabsTrigger>
                      <TabsTrigger value="detailed">Detailed</TabsTrigger>
                    </TabsList>
                    <Button variant="outline" size="sm" onClick={copyAll}>
                      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                      Copy summary
                    </Button>
                  </div>
                  <TabsContent value="quick" className="mt-4">
                    <p className="text-sm leading-relaxed">{result.quickSummary}</p>
                  </TabsContent>
                  <TabsContent value="detailed" className="mt-4">
                    <div className="space-y-3 text-sm leading-relaxed whitespace-pre-wrap">
                      {result.detailedSummary}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="panel p-5">
                  <h2 className="mb-3 text-sm font-semibold tracking-wide uppercase">Decisions</h2>
                  <List items={result.decisions} empty="No explicit decisions were recorded." />
                </div>
                <div className="panel p-5">
                  <h2 className="mb-3 text-sm font-semibold tracking-wide uppercase">Key topics</h2>
                  <List items={result.keyTopics} empty="No distinct topics detected." />
                </div>
                <div className="panel p-5">
                  <h2 className="mb-3 text-sm font-semibold tracking-wide uppercase">Questions</h2>
                  <List items={result.questions} empty="No open questions were raised." />
                </div>
                <div className="panel p-5">
                  <h2 className="mb-3 text-sm font-semibold tracking-wide uppercase">
                    Unresolved issues
                  </h2>
                  <List items={result.openIssues} empty="Nothing left hanging." />
                </div>
              </div>

              <div className="panel p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold tracking-wide uppercase">Action items</h2>
                  {result.actionItems.length > 0 && (
                    <Button asChild variant="outline" size="sm">
                      <Link to="/tasks" search={{ seed: actionItemsText }}>
                        Turn into a plan <ArrowRight className="size-4" />
                      </Link>
                    </Button>
                  )}
                </div>
                {result.actionItems.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No action items were explicitly assigned in this meeting.
                  </p>
                ) : (
                  <ul className="divide-border divide-y">
                    {result.actionItems.map((a) => (
                      <li key={a.task} className="flex flex-wrap items-start gap-3 py-3 first:pt-0">
                        <span className="flex-1 text-sm">{a.task}</span>
                        {a.owner && <Badge variant="secondary">{a.owner}</Badge>}
                        {a.deadline && <Badge variant="outline">{a.deadline}</Badge>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          ) : (
            <div className="panel flex flex-col items-center justify-center px-6 py-20 text-center">
              <span className="bg-secondary text-muted-foreground flex size-12 items-center justify-center rounded-xl">
                <NotebookPen className="size-6" />
              </span>
              <h2 className="mt-4 text-lg font-semibold">Nothing summarized yet</h2>
              <p className="text-muted-foreground mt-1 max-w-sm text-sm">
                Paste a transcript or upload your notes. You'll get a quick take, a detailed
                rundown, and every action item Cadence can find.
              </p>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
