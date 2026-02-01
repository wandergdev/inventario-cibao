const THOUSANDS_SEPARATOR = ",";
const DECIMAL_SEPARATOR = ".";

const formatIntegerWithGrouping = (value: string) => {
  const normalized = value.replace(/^0+(?=\d)/, "") || "0";
  return normalized.replace(/\B(?=(\d{3})+(?!\d))/g, THOUSANDS_SEPARATOR);
};

export const formatMoneyInput = (raw: string) => {
  if (!raw) {
    return "";
  }
  const sanitized = raw
    .replace(/[^\d.,]/g, "")
    .replace(new RegExp(`\\${THOUSANDS_SEPARATOR}`, "g"), "");
  const [integerPart = "", decimalPart = ""] = sanitized.split(DECIMAL_SEPARATOR);
  const formattedInteger = formatIntegerWithGrouping(integerPart || "0");
  const trimmedDecimals = decimalPart.slice(0, 2);
  if (raw.endsWith(DECIMAL_SEPARATOR) && trimmedDecimals.length === 0) {
    return `${formattedInteger}${DECIMAL_SEPARATOR}`;
  }
  return trimmedDecimals.length ? `${formattedInteger}${DECIMAL_SEPARATOR}${trimmedDecimals}` : formattedInteger;
};

export const parseMoneyInput = (value: string) => {
  if (!value) {
    return null;
  }
  const normalized = value.replace(new RegExp(`\\${THOUSANDS_SEPARATOR}`, "g"), "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

export const formatMoneyFromNumber = (value?: number | string | null) => {
  if (value === null || value === undefined) {
    return "";
  }
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return "";
  }
  return formatMoneyInput(numeric.toFixed(2));
};
