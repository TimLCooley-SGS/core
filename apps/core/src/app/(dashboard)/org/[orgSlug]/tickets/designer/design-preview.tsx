"use client";

import type { TicketDesignFieldConfig } from "@sgscore/types/tenant";

interface DesignPreviewProps {
  fieldConfig: TicketDesignFieldConfig;
  backgroundColor: string;
  fontColor: string;
  bodyText: string;
  termsText: string;
  qrCode: boolean;
}

export function DesignPreview({
  fieldConfig,
  backgroundColor,
  fontColor,
  bodyText,
  termsText,
  qrCode,
}: DesignPreviewProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-muted-foreground">
        Live Preview
      </h3>

      {/* Ticket card */}
      <div
        className="w-full rounded-lg border shadow-md overflow-hidden"
        style={{ backgroundColor }}
      >
        <div className="flex" style={{ minHeight: 180 }}>
          {/* Left panel — barcode / QR */}
          <div
            className="flex flex-col items-center justify-center gap-2 px-4 py-4 border-r border-dashed"
            style={{
              width: "40%",
              borderColor: `${fontColor}33`,
            }}
          >
            {fieldConfig.barcode && (
              qrCode ? (
                <div
                  className="w-16 h-16 rounded border-2 grid grid-cols-5 grid-rows-5 gap-px p-1"
                  style={{ borderColor: fontColor }}
                >
                  {Array.from({ length: 25 }).map((_, i) => (
                    <div
                      key={i}
                      className="rounded-sm"
                      style={{
                        backgroundColor:
                          [0,1,2,3,4,5,9,10,14,15,19,20,21,22,23,24].includes(i)
                            ? fontColor
                            : "transparent",
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex items-end gap-px h-14">
                  {[3,1,2,3,1,2,1,3,2,1,3,2,1,1,3,2,1,2,3,1].map((w, i) => (
                    <div
                      key={i}
                      style={{
                        width: w * 2,
                        height: "100%",
                        backgroundColor: fontColor,
                        opacity: i % 3 === 0 ? 1 : 0.7,
                      }}
                    />
                  ))}
                </div>
              )
            )}
            {fieldConfig.order_number && (
              <p className="text-[10px] opacity-60" style={{ color: fontColor }}>
                Order #1042
              </p>
            )}
            {fieldConfig.ticket_number && (
              <p className="text-[10px] opacity-60" style={{ color: fontColor }}>
                Ticket #00127
              </p>
            )}
          </div>

          {/* Right panel — event details */}
          <div
            className="flex-1 flex flex-col justify-center gap-1.5 px-4 py-4"
            style={{ width: "60%" }}
          >
            {fieldConfig.event_name && (
              <p className="text-sm font-bold leading-tight" style={{ color: fontColor }}>
                Summer Gala 2026
              </p>
            )}
            {fieldConfig.guest_name && (
              <p className="text-xs" style={{ color: fontColor }}>
                Jane Smith
              </p>
            )}
            {fieldConfig.location && (
              <p className="text-xs opacity-70" style={{ color: fontColor }}>
                Main Ballroom
              </p>
            )}
            {fieldConfig.date && (
              <p className="text-xs opacity-70" style={{ color: fontColor }}>
                June 15, 2026
              </p>
            )}
            {fieldConfig.time && (
              <p className="text-xs opacity-70" style={{ color: fontColor }}>
                7:00 PM
              </p>
            )}
            {fieldConfig.ticket_price && (
              <p className="text-sm font-semibold mt-1" style={{ color: fontColor }}>
                $45.00
              </p>
            )}
            {fieldConfig.registrant_name && (
              <p className="text-[10px] opacity-50 mt-1" style={{ color: fontColor }}>
                Registered by: John Smith
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Body text block */}
      {bodyText && (
        <div className="rounded-lg border p-4">
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: bodyText }}
          />
        </div>
      )}

      {/* Terms text block */}
      {termsText && (
        <div className="rounded-lg border p-3">
          <div
            className="prose prose-xs max-w-none text-xs text-muted-foreground"
            dangerouslySetInnerHTML={{ __html: termsText }}
          />
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center">
        Preview with sample data
      </p>
    </div>
  );
}
