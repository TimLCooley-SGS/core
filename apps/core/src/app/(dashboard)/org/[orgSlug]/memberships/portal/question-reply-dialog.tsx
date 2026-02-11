"use client";

import { useState, useEffect, useActionState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  Label,
} from "@sgscore/ui";
import type { PortalQuestion } from "@sgscore/types/tenant";
import { TiptapEditor } from "./tiptap-editor";
import { answerQuestion } from "./actions";

interface QuestionReplyDialogProps {
  orgSlug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  question: (PortalQuestion & { person_name?: string }) | null;
}

export function QuestionReplyDialog({
  orgSlug,
  open,
  onOpenChange,
  question,
}: QuestionReplyDialogProps) {
  const [answerHtml, setAnswerHtml] = useState(question?.answer_html ?? "");
  const [state, formAction, pending] = useActionState(answerQuestion, {});

  useEffect(() => {
    setAnswerHtml(question?.answer_html ?? "");
  }, [question]);

  useEffect(() => {
    if (state.success) {
      onOpenChange(false);
    }
  }, [state.success, onOpenChange]);

  function handleSave() {
    if (!question) return;
    const fd = new FormData();
    fd.append("orgSlug", orgSlug);
    fd.append("questionId", question.id);
    fd.append("answerHtml", answerHtml);
    formAction(fd);
  }

  if (!question) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Reply to Question</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border p-3 bg-muted/30 space-y-1">
            <p className="text-sm font-medium">{question.subject}</p>
            <p className="text-xs text-muted-foreground">
              From: {question.person_name ?? "Unknown"} &middot;{" "}
              {new Date(question.created_at).toLocaleDateString()}
            </p>
            {question.content && (
              <p className="text-sm mt-2">{question.content}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Your Answer</Label>
            <TiptapEditor
              content={answerHtml}
              onChange={setAnswerHtml}
              placeholder="Write your answer..."
            />
          </div>
        </div>

        {state.error && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="button"
            disabled={pending || !answerHtml.trim()}
            onClick={handleSave}
          >
            {pending ? "Saving..." : "Send Answer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
