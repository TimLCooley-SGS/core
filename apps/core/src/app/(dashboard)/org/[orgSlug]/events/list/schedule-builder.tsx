"use client";

import { useMemo } from "react";
import { Input, Label, Checkbox, cn } from "@sgscore/ui";
import type { EventType, RecurrenceFrequency } from "@sgscore/types/tenant";

interface ScheduleBuilderProps {
  eventType: EventType;
  date: string;
  setDate: (v: string) => void;
  startDate: string;
  setStartDate: (v: string) => void;
  endDate: string;
  setEndDate: (v: string) => void;
  startTime: string;
  setStartTime: (v: string) => void;
  endTime: string;
  setEndTime: (v: string) => void;
  isAllDay: boolean;
  setIsAllDay: (v: boolean) => void;
  frequency: RecurrenceFrequency;
  setFrequency: (v: RecurrenceFrequency) => void;
  daysOfWeek: number[];
  setDaysOfWeek: (v: number[]) => void;
  recurrenceEndDate: string;
  setRecurrenceEndDate: (v: string) => void;
  occurrenceCount: string;
  setOccurrenceCount: (v: string) => void;
  endCondition: "date" | "count";
  setEndCondition: (v: "date" | "count") => void;
}

const DAY_LABELS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

const FREQUENCY_OPTIONS: { value: RecurrenceFrequency; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Biweekly" },
  { value: "monthly", label: "Monthly" },
];

export function ScheduleBuilder(props: ScheduleBuilderProps) {
  const {
    eventType,
    date, setDate,
    startDate, setStartDate,
    endDate, setEndDate,
    startTime, setStartTime,
    endTime, setEndTime,
    isAllDay, setIsAllDay,
    frequency, setFrequency,
    daysOfWeek, setDaysOfWeek,
    recurrenceEndDate, setRecurrenceEndDate,
    occurrenceCount, setOccurrenceCount,
    endCondition, setEndCondition,
  } = props;

  // Compute preview occurrences
  const previewDates = useMemo(() => {
    const dates: string[] = [];
    const MAX_PREVIEW = 20;

    if (eventType === "single" && date) {
      dates.push(date);
    } else if (eventType === "multi_day" && startDate && endDate) {
      const start = new Date(startDate + "T00:00:00");
      const end = new Date(endDate + "T00:00:00");
      for (let d = new Date(start); d <= end && dates.length < MAX_PREVIEW; d.setDate(d.getDate() + 1)) {
        dates.push(d.toISOString().split("T")[0]);
      }
    } else if (eventType === "recurring" && startDate && frequency) {
      const start = new Date(startDate + "T00:00:00");
      const maxOcc = endCondition === "count" && occurrenceCount
        ? parseInt(occurrenceCount, 10) || 52
        : 365;
      const endD = endCondition === "date" && recurrenceEndDate
        ? new Date(recurrenceEndDate + "T00:00:00")
        : null;

      let current = new Date(start);
      let count = 0;

      while (count < maxOcc && count < 365 && dates.length <= MAX_PREVIEW) {
        if (endD && current > endD) break;

        let shouldInclude = true;
        if ((frequency === "weekly" || frequency === "biweekly") && daysOfWeek.length > 0) {
          shouldInclude = daysOfWeek.includes(current.getDay());
        }

        if (shouldInclude) {
          dates.push(current.toISOString().split("T")[0]);
          count++;
        }

        if (frequency === "daily") {
          current.setDate(current.getDate() + 1);
        } else if (frequency === "weekly" || frequency === "biweekly") {
          current.setDate(current.getDate() + 1);
        } else if (frequency === "monthly") {
          current.setMonth(current.getMonth() + 1);
        }
      }
    }

    return dates;
  }, [eventType, date, startDate, endDate, frequency, daysOfWeek, recurrenceEndDate, occurrenceCount, endCondition]);

  const totalCount = previewDates.length;

  function toggleDay(day: number) {
    setDaysOfWeek(
      daysOfWeek.includes(day)
        ? daysOfWeek.filter((d) => d !== day)
        : [...daysOfWeek, day].sort(),
    );
  }

  return (
    <div className="space-y-4">
      {/* Single Day */}
      {eventType === "single" && (
        <div className="space-y-2">
          <Label htmlFor="eventDate">Date *</Label>
          <Input
            id="eventDate"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      )}

      {/* Multi-Day */}
      {eventType === "multi_day" && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="startDate">Start Date *</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endDate">End Date *</Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Recurring */}
      {eventType === "recurring" && (
        <>
          <div className="space-y-2">
            <Label>Frequency *</Label>
            <div className="grid grid-cols-4 gap-2">
              {FREQUENCY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFrequency(opt.value)}
                  className={cn(
                    "rounded-lg border-2 p-2 text-center text-sm transition-colors",
                    frequency === opt.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted hover:border-muted-foreground/30",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {(frequency === "weekly" || frequency === "biweekly") && (
            <div className="space-y-2">
              <Label>Days of Week</Label>
              <div className="flex gap-2">
                {DAY_LABELS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleDay(value)}
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-full text-xs font-medium transition-colors",
                      daysOfWeek.includes(value)
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted-foreground/20",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="recStartDate">Start Date *</Label>
            <Input
              id="recStartDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>End Condition</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="endCondition"
                  checked={endCondition === "date"}
                  onChange={() => setEndCondition("date")}
                  className="h-4 w-4"
                />
                End Date
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="endCondition"
                  checked={endCondition === "count"}
                  onChange={() => setEndCondition("count")}
                  className="h-4 w-4"
                />
                Number of Occurrences
              </label>
            </div>
          </div>

          {endCondition === "date" && (
            <div className="space-y-2">
              <Label htmlFor="recEndDate">End Date *</Label>
              <Input
                id="recEndDate"
                type="date"
                value={recurrenceEndDate}
                onChange={(e) => setRecurrenceEndDate(e.target.value)}
              />
            </div>
          )}

          {endCondition === "count" && (
            <div className="space-y-2">
              <Label htmlFor="occCount">Number of Occurrences *</Label>
              <Input
                id="occCount"
                type="number"
                min="1"
                max="365"
                className="w-32"
                value={occurrenceCount}
                onChange={(e) => setOccurrenceCount(e.target.value)}
              />
            </div>
          )}
        </>
      )}

      {/* Time (shared) */}
      <div className="flex items-center gap-2">
        <Checkbox
          id="allDay"
          checked={isAllDay}
          onCheckedChange={(checked) => setIsAllDay(checked === true)}
        />
        <Label htmlFor="allDay">All-day event</Label>
      </div>

      {!isAllDay && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="startTime">Start Time</Label>
            <Input
              id="startTime"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endTime">End Time</Label>
            <Input
              id="endTime"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Preview */}
      {previewDates.length > 0 && (
        <div className="rounded-md border p-3 space-y-1">
          <p className="text-sm font-medium">
            Schedule Preview ({totalCount > 20 ? "20+" : totalCount} occurrence{totalCount !== 1 ? "s" : ""})
          </p>
          <div className="space-y-0.5 text-sm text-muted-foreground max-h-60 overflow-y-auto">
            {previewDates.slice(0, 20).map((d, i) => (
              <p key={i}>
                {new Date(d + "T00:00:00").toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
                {!isAllDay && startTime && (
                  <span className="ml-2">
                    {startTime}
                    {endTime ? ` - ${endTime}` : ""}
                  </span>
                )}
              </p>
            ))}
            {totalCount > 20 && (
              <p className="text-muted-foreground/60">...and {totalCount - 20} more</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
