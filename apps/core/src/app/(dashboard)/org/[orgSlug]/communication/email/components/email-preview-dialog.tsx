"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
} from "@sgscore/ui";
import { Monitor, Smartphone } from "lucide-react";

interface EmailPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  html: string;
  subject: string;
}

export function EmailPreviewDialog({
  open,
  onOpenChange,
  html,
  subject,
}: EmailPreviewDialogProps) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle>Preview: {subject || "Untitled"}</DialogTitle>
            <div className="flex rounded-md border">
              <Button
                variant="ghost"
                size="icon"
                className={`h-9 w-9 rounded-r-none border-0 ${device === "desktop" ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground" : ""}`}
                onClick={() => setDevice("desktop")}
              >
                <Monitor className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={`h-9 w-9 rounded-l-none border-0 ${device === "mobile" ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground" : ""}`}
                onClick={() => setDevice("mobile")}
              >
                <Smartphone className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto bg-muted/50 p-6 flex justify-center">
          <div
            className={
              device === "mobile"
                ? "w-[375px] bg-white rounded-[2rem] border-8 border-gray-800 shadow-xl overflow-hidden"
                : "w-full"
            }
          >
            <iframe
              srcDoc={html}
              title="Email preview"
              className="w-full border-0"
              style={{
                height: device === "mobile" ? "calc(85vh - 160px)" : "calc(85vh - 120px)",
              }}
              sandbox="allow-same-origin"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
