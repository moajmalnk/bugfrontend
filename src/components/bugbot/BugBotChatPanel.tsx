import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/context/AuthContext';
import type { BugBotHookState } from '@/hooks/useBugBot';
import { projectService } from '@/services/projectService';
import { bugBotService } from '@/services/bugBotService';
import type { Project } from '@/services/projectService';
import type { BugBotBugDraft, BugBotUpdateDraft } from '@/types/bugbot';
import { Bot, Loader2, Send, Sparkles } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

function isBugDraft(d: unknown): d is BugBotBugDraft {
  return (
    typeof d === 'object' &&
    d !== null &&
    'title' in d &&
    'description' in d &&
    typeof (d as BugBotBugDraft).title === 'string' &&
    typeof (d as BugBotBugDraft).description === 'string'
  );
}

function isUpdateDraft(d: unknown): d is BugBotUpdateDraft {
  return (
    typeof d === 'object' &&
    d !== null &&
    'title' in d &&
    'description' in d &&
    'type' in d
  );
}

interface BugBotChatPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bugBot: BugBotHookState;
}

export function BugBotChatPanel({ open, onOpenChange, bugBot }: BugBotChatPanelProps) {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const {
    mode,
    setMode,
    projectId,
    setProjectId,
    messages,
    loading,
    error,
    setError,
    lastReply,
    resetConversation,
    applyExchange,
    sendUserMessage,
  } = bugBot;

  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [input, setInput] = useState('');
  const [quickNote, setQuickNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const canDevMode =
    currentUser?.role === 'developer' || currentUser?.role === 'admin';

  useEffect(() => {
    if (!open) return;
    setProjectsLoading(true);
    projectService
      .getProjects()
      .then(setProjects)
      .catch(() => setProjects([]))
      .finally(() => setProjectsLoading(false));
  }, [open]);

  useEffect(() => {
    if (open) {
      resetConversation();
      setInput('');
      setQuickNote('');
      setError(null);
    }
  }, [open, resetConversation, setError]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = () => {
    if (!input.trim()) return;
    sendUserMessage(input);
    setInput('');
  };

  const handleFinalizeBug = async () => {
    if (!projectId) {
      toast({
        title: 'Select a project',
        description: 'Choose the project this bug belongs to.',
        variant: 'destructive',
      });
      return;
    }
    const draft = lastReply?.draft;
    if (!isBugDraft(draft)) return;
    setSubmitting(true);
    try {
      const { bug_id } = await bugBotService.finalizeBug(draft, projectId);
      toast({ title: 'Bug created', description: 'Redirecting to the bug…' });
      onOpenChange(false);
      navigate(`/bugs/${bug_id}`);
    } catch (e) {
      toast({
        title: 'Could not create bug',
        description: e instanceof Error ? e.message : 'Error',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateUpdate = async () => {
    if (!projectId) {
      toast({
        title: 'Select a project',
        variant: 'destructive',
      });
      return;
    }
    const draft = lastReply?.draft;
    if (!isUpdateDraft(draft)) return;
    setSubmitting(true);
    try {
      await bugBotService.createUpdate(draft, projectId);
      toast({ title: 'Update posted' });
      onOpenChange(false);
      const r = currentUser?.role;
      navigate(r ? `/${r}/updates` : '/');
    } catch (e) {
      toast({
        title: 'Could not create update',
        description: e instanceof Error ? e.message : 'Error',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickFormat = async () => {
    const note = quickNote.trim();
    if (!note) return;
    setSubmitting(true);
    setError(null);
    try {
      const reply = await bugBotService.formatUpdate(note, projectId || null);
      applyExchange(note, reply);
      setQuickNote('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Format failed');
    } finally {
      setSubmitting(false);
    }
  };

  const showBugConfirm = lastReply?.kind === 'bug_draft' && isBugDraft(lastReply.draft);
  const showUpdateConfirm =
    lastReply?.kind === 'update_draft' && isUpdateDraft(lastReply.draft);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg sm:max-w-2xl h-[min(90vh,640px)] flex flex-col p-0 border-border/80 bg-card/95 backdrop-blur-md shadow-2xl">
        <DialogHeader className="px-6 pt-6 pb-3 border-b border-border/60 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Bot className="h-5 w-5" />
            </span>
            BugBot
          </DialogTitle>
          <p className="text-xs text-muted-foreground font-normal pr-8">
            AI-assisted bug reports and formal updates. Server-side Gemini; your API key stays on the backend.
          </p>
        </DialogHeader>

        <div className="px-6 py-3 flex flex-col gap-3 border-b border-border/50 shrink-0">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-muted-foreground w-full sm:w-auto">Project</span>
            <Select
              value={projectId || '__none__'}
              onValueChange={(v) => setProjectId(v === '__none__' ? '' : v)}
              disabled={projectsLoading}
            >
              <SelectTrigger className="w-full sm:w-[240px] h-9 bg-background/80 rounded-lg text-sm">
                <SelectValue placeholder={projectsLoading ? 'Loading…' : 'Select project'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {canDevMode && (
            <div className="flex rounded-lg bg-muted/40 p-1 gap-1">
              <Button
                type="button"
                variant={mode === 'bug_report' ? 'secondary' : 'ghost'}
                size="sm"
                className="flex-1 rounded-md text-xs h-8"
                onClick={() => {
                  setMode('bug_report');
                  resetConversation();
                }}
              >
                Report / ask
              </Button>
              <Button
                type="button"
                variant={mode === 'developer_update' ? 'secondary' : 'ghost'}
                size="sm"
                className="flex-1 rounded-md text-xs h-8"
                onClick={() => {
                  setMode('developer_update');
                  resetConversation();
                }}
              >
                Fast update
              </Button>
            </div>
          )}
        </div>

        <ScrollArea className="flex-1 min-h-0 px-6">
          <div className="py-4 space-y-4 pr-2">
            {messages.length === 0 && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {mode === 'developer_update'
                  ? 'Describe what you shipped or changed. BugBot will turn it into a formal update log.'
                  : 'Describe the issue or ask a question about the project. BugBot will clarify, answer from linked docs when possible, or draft a bug.'}
              </p>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[92%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-md'
                      : 'bg-muted/80 text-foreground border border-border/50 rounded-bl-md'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.content}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Thinking…
              </div>
            )}
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>

        {(showBugConfirm || showUpdateConfirm) && (
          <div className="px-6 py-3 border-t border-border/60 bg-muted/20 space-y-2 shrink-0">
            <p className="text-xs font-medium text-muted-foreground">Ready to submit</p>
            {showBugConfirm && isBugDraft(lastReply?.draft) && (
              <div className="rounded-xl border border-border/60 bg-background/60 p-3 text-xs space-y-1">
                <p className="font-semibold">{lastReply.draft.title}</p>
                <p className="text-muted-foreground line-clamp-3">{lastReply.draft.description}</p>
              </div>
            )}
            {showUpdateConfirm && isUpdateDraft(lastReply?.draft) && (
              <div className="rounded-xl border border-border/60 bg-background/60 p-3 text-xs space-y-1">
                <p className="font-semibold">{lastReply.draft.title}</p>
                <p className="text-muted-foreground">Type: {lastReply.draft.type}</p>
              </div>
            )}
            <div className="flex gap-2">
              {showBugConfirm && (
                <Button
                  size="sm"
                  className="rounded-lg"
                  disabled={submitting || !projectId}
                  onClick={handleFinalizeBug}
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create bug'}
                </Button>
              )}
              {showUpdateConfirm && (
                <Button
                  size="sm"
                  className="rounded-lg"
                  disabled={submitting || !projectId}
                  onClick={handleCreateUpdate}
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Post update'}
                </Button>
              )}
            </div>
          </div>
        )}

        {mode === 'developer_update' && canDevMode && (
          <div className="px-6 py-2 border-t border-border/40 shrink-0">
            <p className="text-[11px] text-muted-foreground mb-1">Quick note (optional)</p>
            <div className="flex gap-2">
              <Textarea
                value={quickNote}
                onChange={(e) => setQuickNote(e.target.value)}
                placeholder="One-line fix note…"
                className="min-h-[52px] max-h-24 text-sm rounded-lg resize-none bg-background/80"
                rows={2}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="shrink-0 rounded-xl h-[52px] w-[52px]"
                disabled={submitting || !quickNote.trim()}
                onClick={handleQuickFormat}
                title="Send to AI chat"
              >
                <Sparkles className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        <div className="px-6 py-4 border-t border-border/60 flex gap-2 shrink-0 bg-background/40">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Message BugBot…"
            className="min-h-[44px] max-h-32 flex-1 resize-none rounded-xl text-sm bg-background/90"
            rows={2}
          />
          <Button
            type="button"
            size="icon"
            className="shrink-0 rounded-xl h-11 w-11"
            disabled={loading || !input.trim()}
            onClick={handleSend}
            aria-label="Send"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
