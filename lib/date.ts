import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(customParseFormat);

const candidateFormats = [
  "YYYY-MM-DD",
  "YYYY/MM/DD",
  "D MMM YYYY",
  "DD MMM YYYY",
  "MMMM D, YYYY",
  "MMM D, YYYY",
  "MMMM YYYY",
  "MMM YYYY",
  "YYYY-MM",
  "YYYY",
];

export function normalizeDate(raw: string | null | undefined) {
  if (!raw) {
    return null;
  }

  const value = raw.trim();
  if (!value) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  for (const format of candidateFormats) {
    const parsed = dayjs(value, format, true);
    if (parsed.isValid()) {
      if (format === "MMMM YYYY" || format === "MMM YYYY" || format === "YYYY-MM") {
        return parsed.startOf("month").format("YYYY-MM-DD");
      }

      if (format === "YYYY") {
        return parsed.startOf("year").format("YYYY-MM-DD");
      }

      return parsed.format("YYYY-MM-DD");
    }
  }

  const fallback = dayjs(value);
  return fallback.isValid() ? fallback.format("YYYY-MM-DD") : null;
}
