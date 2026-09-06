/**
 * Every date-only field in this app (Evaluation.date, Match.date, etc.) is
 * stored as UTC midnight for the calendar day the user picked (a plain
 * "YYYY-MM-DD" input coerced via z.coerce.date()). Formatting it with the
 * *local* timezone (the default for toLocaleDateString) shifts it back a day
 * for any timezone behind UTC — which is why Chile saw dates off by one.
 * Always format these as UTC so the displayed day matches what was entered.
 */
export function formatDate(
  value: string | Date,
  locale: "es-CL" | "es-AR" = "es-CL",
  options?: Intl.DateTimeFormatOptions,
): string {
  return new Date(value).toLocaleDateString(locale, { ...options, timeZone: "UTC" });
}
