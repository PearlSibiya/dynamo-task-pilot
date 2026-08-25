import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Copy, Loader2, RefreshCw, Sparkles, Mail, AlertTriangle, Check } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { generateEmail } from "@/lib/ai.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Smart Email Generator — Cadence AI Assistant" },
      {
        name: "description",
        content:
          "Turn a one-line instruction into a polished email with a suggested subject line, five tones, and instant regeneration.",
      },
      { property: "og:title", content: "Smart Email Generator — Cadence AI Assistant" },
      {
        property: "og:description",
        content: "Write professional emails from short instructions with AI. No sign-up required.",
      },
    ],
  }),
  component: EmailsPage,
});

const TONES = ["professional", "friendly", "concise", "persuasive", "formal"] as const;
type Tone = (typeof TONES)[number];

const EXAMPLES = [
  "Ask Priya for the Q3 budget numbers before Friday's review",
  "Follow up on the unpaid invoice #1043, politely but firmly",
  "Decline the vendor demo request without closing the door",
];

function EmailsPage() {
  const runGenerate = useServerFn(generateEmail);
  const [instruction, setInstruction] = useState("");
  const [tone, setTone] = useState<Tone>("professional");
  const [recipient, setRecipient] = useState("");
  const [sender, setSender] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [notes, setNotes] = useState<string[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (opts: { regenerate?: boolean }) =>
      runGenerate({
        data: {
          instruction,
          tone,
          recipient: recipient || undefined,
          sender: sender || undefined,
          previous: opts.regenerate && body ? `Subject: ${subject}\n\n${body}` : undefined,
        },
      }),
    onSuccess: (result) => {
      setSubject(result.subject);
      setBody(result.body);
      setNotes(result.notes ?? []);
    },
  });

  const copy = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setTimeout(() => setCopied(null), 1600);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Couldn't copy to clipboard");
    }
  };

  const hasResult = Boolean(subject || body);

  return (
    <AppShell
      title="Smart Email Generator"
      description="Describe what you need to say in plain language. Cadence writes the email, suggests a subject line, and keeps your intent intact."
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        <section className="panel h-fit p-5">
          <form
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              if (!instruction.trim()) {
                toast.error("Tell Cadence what the email should say first.");
                return;
              }
              mutation.mutate({});
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="instruction">What should this email say?</Label>
              <Textarea
                id="instruction"
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                rows={5}
                placeholder="e.g. Ask the design team for feedback on the new onboarding flow by Thursday"
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => setInstruction(ex)}
                    className="bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground rounded-full px-3 py-1 text-xs transition-colors"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tone</Label>
              <div className="flex flex-wrap gap-2">
                {TONES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTone(t)}
                    aria-pressed={tone === t}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                      tone === t
                        ? "border-accent bg-accent text-accent-foreground"
                        : "border-border bg-card text-muted-foreground hover:border-accent/50"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="recipient">Recipient (optional)</Label>
                <Input
                  id="recipient"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="Priya, Head of Finance"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sender">Sign-off (optional)</Label>
                <Input
                  id="sender"
                  value={sender}
                  onChange={(e) => setSender(e.target.value)}
                  placeholder="Alex, Product"
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Writing…
                </>
              ) : (
                <>
                  <Sparkles className="size-4" /> Generate email
                </>
              )}
            </Button>
          </form>
        </section>

        <section className="space-y-4">
          {mutation.isError && (
            <div className="border-destructive/40 bg-destructive/10 text-destructive flex gap-3 rounded-xl border p-4 text-sm">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <div>
                <p className="font-medium">Generation failed</p>
                <p className="opacity-90">{(mutation.error as Error).message}</p>
              </div>
            </div>
          )}

          {mutation.isPending && !hasResult ? (
            <div className="panel space-y-3 p-5">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ) : hasResult ? (
            <>
              <div className="panel p-5">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="subject">Suggested subject line</Label>
                    <Input
                      id="subject"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="font-display text-base"
                    />
                  </div>
                  <Button variant="outline" size="sm" onClick={() => copy("Subject", subject)}>
                    {copied === "Subject" ? <Check className="size-4" /> : <Copy className="size-4" />}
                    Copy
                  </Button>
                </div>
              </div>

              <div className="panel p-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="body">Email body</Label>
                    <Badge variant="secondary" className="capitalize">
                      {tone}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={mutation.isPending}
                      onClick={() => mutation.mutate({ regenerate: true })}
                    >
                      <RefreshCw
                        className={`size-4 ${mutation.isPending ? "animate-spin" : ""}`}
                      />
                      Regenerate
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copy("Email", `Subject: ${subject}\n\n${body}`)}
                    >
                      {copied === "Email" ? <Check className="size-4" /> : <Copy className="size-4" />}
                      Copy all
                    </Button>
                  </div>
                </div>
                <Textarea
                  id="body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={18}
                  className="leading-relaxed"
                />
                {notes.length > 0 && (
                  <ul className="text-muted-foreground mt-4 space-y-1.5 text-xs">
                    {notes.map((n) => (
                      <li key={n} className="flex gap-2">
                        <span className="text-accent">•</span>
                        {n}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          ) : (
            <div className="panel flex flex-col items-center justify-center px-6 py-20 text-center">
              <span className="bg-secondary text-muted-foreground flex size-12 items-center justify-center rounded-xl">
                <Mail className="size-6" />
              </span>
              <h2 className="mt-4 text-lg font-semibold">No draft yet</h2>
              <p className="text-muted-foreground mt-1 max-w-sm text-sm">
                Write a short instruction on the left — one sentence is enough. Your draft appears
                here, fully editable.
              </p>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
