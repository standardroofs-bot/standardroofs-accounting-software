import Decimal from "decimal.js";

// Configure Decimal.js for financial accuracy
Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export { Decimal };

export function toDecimal(value: string | number | Decimal | null | undefined): Decimal {
  if (value === null || value === undefined || value === "") {
    return new Decimal(0);
  }
  return new Decimal(value);
}

/**
 * Format a Decimal / number as Indian Rupee string (e.g. ₹ 1,50,000.00)
 */
export function formatINR(amount: string | number | Decimal | null | undefined): string {
  const d = toDecimal(amount);
  const isNegative = d.isNegative();
  const absVal = d.abs().toFixed(2);
  const parts = absVal.split(".");
  let intPart = parts[0];
  const decPart = parts[1];

  // Indian comma formatting: last 3 digits, then every 2 digits
  let lastThree = intPart.substring(intPart.length - 3);
  const otherNumbers = intPart.substring(0, intPart.length - 3);
  if (otherNumbers !== "") {
    lastThree = "," + lastThree;
  }
  const formattedInt = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + lastThree;

  return `${isNegative ? "-" : ""}₹ ${formattedInt}.${decPart}`;
}

/**
 * Format plain number with 2 decimal places without currency symbol
 */
export function formatAmount(amount: string | number | Decimal | null | undefined): string {
  const d = toDecimal(amount);
  return d.toFixed(2);
}

/**
 * Check if two Decimals are equal within 0.001
 */
export function isAmountEqual(a: Decimal | number | string, b: Decimal | number | string): boolean {
  const decA = toDecimal(a);
  const decB = toDecimal(b);
  return decA.minus(decB).abs().lessThan(0.001);
}

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function convertTwoDigits(num: number): string {
  if (num === 0) return "";
  if (num < 20) return ONES[num];
  const t = Math.floor(num / 10);
  const o = num % 10;
  return `${TENS[t]}${o ? " " + ONES[o] : ""}`;
}

function convertThreeDigits(num: number): string {
  if (num === 0) return "";
  const h = Math.floor(num / 100);
  const rem = num % 100;
  const hStr = h > 0 ? `${ONES[h]} Hundred` : "";
  const remStr = convertTwoDigits(rem);
  if (hStr && remStr) return `${hStr} and ${remStr}`;
  return hStr || remStr;
}

/**
 * Convert number/Decimal to Indian Rupees words: e.g. "One Lakh Fifty Thousand Rupees Only"
 */
export function numberToWordsINR(amount: string | number | Decimal | null | undefined): string {
  const d = toDecimal(amount);
  if (d.isZero()) return "Zero Rupees Only";

  const isNeg = d.isNegative();
  const absD = d.abs();
  const [intStr, decStr] = absD.toFixed(2).split(".");
  let n = parseInt(intStr, 10);
  const paise = parseInt(decStr, 10);

  if (n === 0 && paise === 0) return "Zero Rupees Only";

  let words = "";

  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  const hundred = n;

  if (crore > 0) {
    words += `${convertTwoDigits(crore)} Crore `;
  }
  if (lakh > 0) {
    words += `${convertTwoDigits(lakh)} Lakh `;
  }
  if (thousand > 0) {
    words += `${convertTwoDigits(thousand)} Thousand `;
  }
  if (hundred > 0) {
    words += `${convertThreeDigits(hundred)} `;
  }

  words = words.trim();
  const rupeePart = words ? `${words} Rupees` : "";
  const paisePart = paise > 0 ? `${convertTwoDigits(paise)} Paise` : "";

  let result = "";
  if (rupeePart && paisePart) {
    result = `${rupeePart} and ${paisePart} Only`;
  } else if (rupeePart) {
    result = `${rupeePart} Only`;
  } else {
    result = `${paisePart} Only`;
  }

  return isNeg ? `Minus ${result}` : result;
}
