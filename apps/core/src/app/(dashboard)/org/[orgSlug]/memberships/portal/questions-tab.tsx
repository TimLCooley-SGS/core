"use client";

import { useState, useEffect, useActionState } from "react";
import {
  Button,
  Badge,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@sgscore/ui";
import { MessageSquare, Trash2 } from "lucide-react";
import type { PortalQuestion } from "@sgscore/types/tenant";
import { QuestionReplyDialog } from "./question-reply-dialog";
import { archiveQuestion } from "./actions";

interface QuestionsTabProps {
  orgSlug: string;
  questions: (PortalQuestion & { person_name?: string })[];
}

export function QuestionsTab({ orgSlug, questions }: QuestionsTabProps) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyTarget, setReplyTarget] = useState<
    (PortalQuestion & { person_name?: string }) | null
  >(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [archiveState, archiveAction, archivePending] = useActionState(
    archiveQuestion,
    {},
  );

  useEffect(() => {
    if (archiveState.success) {
      setDeleteOpen(false);
      setDeleteTarget(null);
    }
  }, [archiveState.success]);

  function openReply(q: PortalQuestion & { person_name?: string }) {
    setReplyTarget(q);
    setReplyOpen(true);
  }

  function confirmArchive(id: string) {
    setDeleteTarget(id);
    setDeleteOpen(true);
  }

  function handleArchive() {
    if (!deleteTarget) return;
    const fd = new FormData();
    fd.append("orgSlug", orgSlug);
    fd.append("questionId", deleteTarget);
    archiveAction(fd);
  }

  const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
    pending: "outline",
    answered: "default",
  };

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold">Member Questions</h3>

      {questions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No questions from members yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {questions.map((q) => (
            <Card key={q.id}>
              <CardContent className="p-4 flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{q.subject}</span>
                    <Badge
                      variant={STATUS_VARIANT[q.status] ?? "secondary"}
                      className="text-xs"
                    >
                      {q.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {q.person_name ?? "Unknown"} &middot;{" "}
                    {new Date(q.created_at).toLocaleDateString()}
                  </p>
                  {q.content && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {q.content}
                    </p>
                  )}
                  {q.answer_html && (
                    <div className="mt-2 rounded-md bg-muted/30 p-2">
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        Answer:
                      </p>
                      <div
                        className="text-sm prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: q.answer_html }}
                      />
                    </div>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => openReply(q)}
                    title="Reply"
                  >
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => confirmArchive(q.id)}
                    title="Archive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Reply dialog */}
      <QuestionReplyDialog
        orgSlug={orgSlug}
        open={replyOpen}
        onOpenChange={setReplyOpen}
        question={replyTarget}
      />

      {/* Archive confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive Question</DialogTitle>
            <DialogDescription>
              This question will be archived and hidden from the list.
            </DialogDescription>
          </DialogHeader>
          {archiveState.error && (
            <p className="text-sm text-destructive">{archiveState.error}</p>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              disabled={archivePending}
              onClick={handleArchive}
            >
              {archivePending ? "Archiving..." : "Archive"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
