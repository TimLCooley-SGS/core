"use client";

interface DesignerPreviewProps {
  heroImageUrl: string | null;
  welcomeHeading: string;
  welcomeBody: string;
  buttonText: string;
  helperText: string;
  accentColor: string;
}

export function DesignerPreview({
  heroImageUrl,
  welcomeHeading,
  welcomeBody,
  buttonText,
  helperText,
  accentColor,
}: DesignerPreviewProps) {
  return (
    <div className="rounded-lg border bg-background overflow-hidden shadow-sm">
      <div className="px-3 py-2 border-b bg-muted/50">
        <p className="text-xs text-muted-foreground font-medium">
          Login Page Preview
        </p>
      </div>
      <div className="p-6 space-y-4 min-h-[400px]">
        {/* Hero image area */}
        <div
          className="w-full rounded-lg overflow-hidden bg-muted"
          style={{ aspectRatio: "16 / 9" }}
        >
          {heroImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={heroImageUrl}
              alt="Hero"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
              No hero image
            </div>
          )}
        </div>

        {/* Welcome heading */}
        <h2 className="text-xl font-bold text-center">
          {welcomeHeading || "Welcome to Your Membership Portal"}
        </h2>

        {/* Welcome body */}
        {welcomeBody && (
          <div
            className="text-sm text-muted-foreground text-center prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: welcomeBody }}
          />
        )}

        {/* Helper text */}
        {helperText && (
          <p className="text-xs text-muted-foreground text-center">
            {helperText}
          </p>
        )}

        {/* Email input mockup */}
        <div className="max-w-xs mx-auto space-y-3">
          <div className="h-9 rounded-md border bg-muted/30 flex items-center px-3">
            <span className="text-xs text-muted-foreground">
              member@example.com
            </span>
          </div>

          {/* Sign in button */}
          <div
            className="h-9 rounded-md flex items-center justify-center text-sm font-medium text-white"
            style={{ backgroundColor: accentColor }}
          >
            {buttonText || "Sign In"}
          </div>
        </div>
      </div>
    </div>
  );
}
