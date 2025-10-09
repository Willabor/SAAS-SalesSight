import { useEffect, useState } from "react";
import {
  addDays,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  isAfter,
  max as dfMax,
  min as dfMin,
  parseISO,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
} from "date-fns";

/**
 * DateRangeFilter.tsx
 * A compact desktop-friendly date range selector with preset dropdown and dynamic From/To date inputs.
 * - Uses native <input type="date"> for reliability
 * - Presets auto-fill dates; Custom keeps inputs editable
 * - Emits YYYY-MM-DD strings
 */

// ---------- Types ----------
export type Preset =
  | "Custom"
  | "Today"
  | "Yesterday"
  | "This Year Week-to-date"
  | "Last Week"
  | "Week Before Last"
  | "This Year Month-to-date"
  | "Last Month"
  | "Last 30 Days"
  | "Last 60 Days"
  | "Last 90 Days"
  | "This Year-to-date"
  | "Last Year Today"
  | "Last Year Week-to-date"
  | "Last Year Month-to-date"
  | "Last Year Year-to-date"
  | "All";

export interface DateRangeFilterProps {
  defaultPreset?: Preset; // default 'Custom'
  defaultFrom?: string; // YYYY-MM-DD used when Custom
  defaultTo?: string; // YYYY-MM-DD used when Custom
  minDate?: string; // optional clamp for All/Custom and general bounds
  maxDate?: string; // optional clamp; default today
  onChange?: (v: { preset: Preset; from: string; to: string }) => void;
  className?: string;
  hideLabels?: boolean; // optional flag to hide labels
}

// ---------- Utilities ----------
const toYMD = (d: Date) => format(d, "yyyy-MM-dd");
const fromYMD = (s: string) => parseISO(s);

const clamp = (d: Date, min?: string, max?: string) => {
  let out = d;
  if (min) out = dfMax([out, fromYMD(min)]);
  if (max) out = dfMin([out, fromYMD(max)]);
  return out;
};

/** Week starts Monday */
const SOW = { weekStartsOn: 1 as const };

export function resolveRange(
  preset: Preset,
  opts: { minDate?: string; maxDate?: string; today?: Date } = {}
): { from: string; to: string } {
  const today = clamp(opts.today ?? new Date(), opts.minDate, opts.maxDate);
  const maxDate = opts.maxDate ?? toYMD(today);
  const minDate = opts.minDate;

  const clampOut = (d1: Date, d2: Date) => ({
    from: toYMD(clamp(d1, minDate, maxDate)),
    to: toYMD(clamp(d2, minDate, maxDate)),
  });

  switch (preset) {
    case "Today": {
      return clampOut(today, today);
    }
    case "Yesterday": {
      const y = subDays(today, 1);
      return clampOut(y, y);
    }
    case "Last Week": {
      const endPrev = endOfWeek(subDays(today, 7), SOW);
      const startPrev = startOfWeek(endPrev, SOW);
      return clampOut(startPrev, endPrev);
    }
    case "Week Before Last": {
      const endPrev2 = endOfWeek(subDays(today, 14), SOW);
      const startPrev2 = startOfWeek(endPrev2, SOW);
      return clampOut(startPrev2, endPrev2);
    }
    case "This Year Month-to-date": {
      const start = startOfMonth(today);
      return clampOut(start, today);
    }
    case "Last Month": {
      const firstOfThis = startOfMonth(today);
      const endPrev = subDays(firstOfThis, 1);
      const startPrev = startOfMonth(endPrev);
      return clampOut(startPrev, endPrev);
    }
    case "Last 30 Days": {
      return clampOut(subDays(today, 30), today);
    }
    case "Last 60 Days": {
      return clampOut(subDays(today, 60), today);
    }
    case "Last 90 Days": {
      return clampOut(subDays(today, 90), today);
    }
    case "This Year-to-date": {
      const start = startOfYear(today);
      return clampOut(start, today);
    }
    case "This Year Week-to-date": {
      const start = startOfWeek(today, SOW);
      return clampOut(start, today);
    }
    case "Last Year Today": {
      const lastYearSameDay = new Date(today);
      lastYearSameDay.setFullYear(today.getFullYear() - 1);
      return clampOut(lastYearSameDay, lastYearSameDay);
    }
    case "Last Year Week-to-date": {
      const sameDOWLastYear = new Date(today);
      sameDOWLastYear.setFullYear(today.getFullYear() - 1);
      const end = sameDOWLastYear; // same weekday as today last year
      const start = startOfWeek(end, SOW);
      return clampOut(start, end);
    }
    case "Last Year Month-to-date": {
      const sameDayLastYear = new Date(today);
      sameDayLastYear.setFullYear(today.getFullYear() - 1);
      const start = startOfMonth(sameDayLastYear);
      // clamp end to last day of that month
      const end = dfMin([sameDayLastYear, endOfMonth(sameDayLastYear)]);
      return clampOut(start, end);
    }
    case "Last Year Year-to-date": {
      const lastYear = new Date(today);
      lastYear.setFullYear(today.getFullYear() - 1);
      const start = startOfYear(lastYear);
      const end = endOfYear(lastYear);
      return clampOut(start, end);
    }
    case "All": {
      const from = minDate ? fromYMD(minDate) : new Date(1900, 0, 1);
      const to = maxDate ? fromYMD(maxDate) : today;
      return clampOut(from, to);
    }
    case "Custom":
    default: {
      // Caller controls dates; keep placeholders to today
      return { from: toYMD(today), to: toYMD(today) };
    }
  }
}

const PRESETS: Preset[] = [
  "Custom",
  "Today",
  "Yesterday",
  "This Year Week-to-date",
  "Last Week",
  "Week Before Last",
  "This Year Month-to-date",
  "Last Month",
  "Last 30 Days",
  "Last 60 Days",
  "Last 90 Days",
  "This Year-to-date",
  "Last Year Today",
  "Last Year Week-to-date",
  "Last Year Month-to-date",
  "Last Year Year-to-date",
  "All",
];

export default function DateRangeFilter(props: DateRangeFilterProps) {
  const todayStr = toYMD(new Date());
  const maxFallback = props.maxDate ?? todayStr;

  const initialPreset: Preset = props.defaultPreset ?? "Custom";
  const initialRange =
    initialPreset === "Custom"
      ? {
          from: props.defaultFrom ?? todayStr,
          to: props.defaultTo ?? todayStr,
        }
      : resolveRange(initialPreset, {
          minDate: props.minDate,
          maxDate: props.maxDate ?? todayStr,
        });

  const [preset, setPreset] = useState<Preset>(initialPreset);
  const [from, setFrom] = useState<string>(initialRange.from);
  const [to, setTo] = useState<string>(initialRange.to);

  // When preset changes (non-Custom), compute range
  useEffect(() => {
    if (preset !== "Custom") {
      const r = resolveRange(preset, {
        minDate: props.minDate,
        maxDate: maxFallback,
      });
      setFrom(r.from);
      setTo(r.to);
    }
  }, [preset, props.minDate, maxFallback]);

  // Ensure from <= to in Custom
  useEffect(() => {
    if (preset === "Custom" && isAfter(fromYMD(from), fromYMD(to))) {
      // auto-swap
      const f = from;
      setFrom(to);
      setTo(f);
    }
  }, [preset, from, to]);

  // Emit onChange immediately (no debounce - parent handles apply button)
  useEffect(() => {
    props.onChange?.({ preset, from, to });
  }, [preset, from, to]);

  const readOnly = preset !== "Custom";

  // Auto-switch to Custom when user clicks on date inputs
  const handleDateInputFocus = () => {
    if (preset !== "Custom") {
      setPreset("Custom");
    }
  };

  return (
    <div className={"flex items-center gap-3 " + (props.className ?? "")}>
      <div className="flex flex-col">
        {!props.hideLabels && (
          <label className="text-sm font-medium mb-1" htmlFor="preset">
            Date
          </label>
        )}
        <select
          id="preset"
          className="border rounded-lg px-3 py-2 min-w-[180px] h-10 bg-background"
          value={preset}
          onChange={(e) => setPreset(e.target.value as Preset)}
        >
          {PRESETS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col">
        {!props.hideLabels && (
          <label className="text-sm font-medium mb-1" htmlFor="from">
            From
          </label>
        )}
        <input
          id="from"
          type="date"
          className="border rounded-lg px-3 py-2 h-10 bg-background cursor-pointer"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          onFocus={handleDateInputFocus}
          onClick={handleDateInputFocus}
          min={props.minDate}
          max={props.maxDate ?? todayStr}
        />
      </div>

      <div className="flex flex-col">
        {!props.hideLabels && (
          <label className="text-sm font-medium mb-1" htmlFor="to">
            To
          </label>
        )}
        <input
          id="to"
          type="date"
          className="border rounded-lg px-3 py-2 h-10 bg-background cursor-pointer"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          onFocus={handleDateInputFocus}
          onClick={handleDateInputFocus}
          min={props.minDate}
          max={props.maxDate ?? todayStr}
        />
      </div>
    </div>
  );
}
