"use client";

import type { MembershipCardField } from "@sgscore/types/tenant";

const FIELD_LABELS: Record<MembershipCardField, string> = {
  program_name: "Program Name",
  member_name: "Member Name",
  membership_id: "Membership ID",
  status: "Status",
  expiration_date: "Expiration Date",
  start_date: "Start Date",
  amount: "Amount",
  seat_count: "Seat Count",
  barcode: "Barcode",
  member_since: "Member Since",
};

const SAMPLE_VALUES: Record<MembershipCardField, string> = {
  program_name: "Gold Membership",
  member_name: "Jane Smith",
  membership_id: "MEM-00042",
  status: "Active",
  expiration_date: "12/31/2026",
  start_date: "01/01/2026",
  amount: "$120.00",
  seat_count: "2",
  barcode: "|||||| |||| ||||| ||",
  member_since: "2024",
};

interface CardPreviewProps {
  side: "front" | "back";
  onSideChange: (side: "front" | "back") => void;
  frontFields: MembershipCardField[];
  backFields: MembershipCardField[];
  fontColor: string;
  accentColor: string;
  backgroundColor: string;
  frontImageUrl: string | null;
}

export function CardPreview({
  side,
  onSideChange,
  frontFields,
  backFields,
  fontColor,
  accentColor,
  backgroundColor,
  frontImageUrl,
}: CardPreviewProps) {
  const fields = side === "front" ? frontFields : backFields;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          Live Preview
        </h3>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => onSideChange("front")}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              side === "front"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            Front
          </button>
          <button
            type="button"
            onClick={() => onSideChange("back")}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              side === "back"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            Back
          </button>
        </div>
      </div>

      {/* Card — credit card aspect ratio 3.375:2.125 ≈ 1.588:1 */}
      <div
        className="relative w-full rounded-xl border shadow-md overflow-hidden"
        style={{
          aspectRatio: "3.375 / 2.125",
          backgroundColor,
        }}
      >
        {/* Background image (front only) */}
        {side === "front" && frontImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={frontImageUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        {/* Content overlay */}
        <div className="relative z-10 h-full flex flex-col justify-between p-4">
          {/* Accent bar at top */}
          <div
            className="h-1 w-12 rounded-full mb-2"
            style={{ backgroundColor: accentColor }}
          />

          {/* Fields */}
          <div className="flex-1 flex flex-col justify-center gap-1.5">
            {fields.length === 0 ? (
              <p
                className="text-xs italic opacity-50"
                style={{ color: fontColor }}
              >
                No fields selected
              </p>
            ) : (
              fields.map((field) => (
                <div key={field}>
                  <p
                    className="text-[9px] uppercase tracking-wider opacity-60"
                    style={{ color: fontColor }}
                  >
                    {FIELD_LABELS[field]}
                  </p>
                  <p
                    className={
                      field === "barcode"
                        ? "text-sm font-mono tracking-[0.3em]"
                        : "text-sm font-medium"
                    }
                    style={{ color: fontColor }}
                  >
                    {SAMPLE_VALUES[field]}
                  </p>
                </div>
              ))
            )}
          </div>

          {/* Bottom accent */}
          <div
            className="h-0.5 w-full rounded-full mt-2 opacity-30"
            style={{ backgroundColor: accentColor }}
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        {side === "front" ? "Front" : "Back"} side preview with sample data
      </p>
    </div>
  );
}
