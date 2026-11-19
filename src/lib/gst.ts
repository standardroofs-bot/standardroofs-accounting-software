import { Decimal, toDecimal } from "./decimal";

export const COMPANY_GST_STATE_CODE = "33"; // Tamil Nadu
export const COMPANY_STATE = "Tamil Nadu";
export const COMPANY_NAME = "Standard Roofs";
export const COMPANY_ORG_ID = "60069196862";
export const COMPANY_PORTAL = "standardroofs1";
export const COMPANY_CONTACT_PERSON = "Prabhakaran T";
export const COMPANY_GSTIN = "33AEWFS5187G1ZD";
export const COMPANY_PAN = "AEWFS5187G";
export const COMPANY_ADDRESS = "144/A, Vellakkal Medu, Villarasampatti, Nasiyanur (Post), Erode, Tamil Nadu, India – 638107";
export const COMPANY_PHONE = "+91 8608475767";
export const COMPANY_EMAIL = "info@standardroofs.in";
export const COMPANY_WEBSITE = "https://www.standardroofs.in/";
export const COMPANY_BANK_NAME = "ICICI Bank";
export const COMPANY_BANK_ACCOUNT_NAME = "Standard Roofs (ICICI, xxxx3161)";
export const COMPANY_BANK_BRANCH = "Kagam, Erode";
export const COMPANY_BANK_AC_NO = "155205003161";
export const COMPANY_BANK_IFSC = "ICIC0001552";

export interface GSTCalculationResult {
  isInterState: boolean;
  taxableAmount: Decimal;
  gstRate: Decimal;
  cgstRate: Decimal;
  cgstAmount: Decimal;
  sgstRate: Decimal;
  sgstAmount: Decimal;
  igstRate: Decimal;
  igstAmount: Decimal;
  totalTax: Decimal;
  totalAmount: Decimal;
}

/**
 * Validate Indian 15-digit GSTIN
 */
export function validateGSTIN(gstin: string): boolean {
  if (!gstin) return false;
  const clean = gstin.trim().toUpperCase();
  const regex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return regex.test(clean);
}

/**
 * Extract State Code from 15-digit GSTIN
 */
export const STATE_NAMES: Record<string, string> = {
  "33": "Tamil Nadu",
  "32": "Kerala",
  "29": "Karnataka",
  "37": "Andhra Pradesh",
  "36": "Telangana",
  "27": "Maharashtra",
  "07": "Delhi",
  "24": "Gujarat",
  "09": "Uttar Pradesh",
};

export function getStateFromGSTIN(gstin?: string | null): { code: string; name: string } | null {
  if (!gstin || gstin.trim().length < 2) return null;
  const code = gstin.trim().substring(0, 2);
  const name = STATE_NAMES[code] || "Other State";
  return { code, name };
}

export function getStateCodeFromGSTIN(gstin?: string | null): string {
  if (!gstin || gstin.trim().length < 2) return COMPANY_GST_STATE_CODE;
  return gstin.trim().substring(0, 2);
}

export function calculateGST(
  taxableAmountInput: Decimal | number | string,
  customerStateCode?: string | null,
  gstRateInput: Decimal | number | string = 18.00
): GSTCalculationResult {
  const taxable = toDecimal(taxableAmountInput);
  const totalRate = toDecimal(gstRateInput);

  const cleanStateCode = (customerStateCode || COMPANY_GST_STATE_CODE).trim();
  const isInterState = cleanStateCode !== COMPANY_GST_STATE_CODE;

  let cgstRate = new Decimal(0);
  let cgstAmount = new Decimal(0);
  let sgstRate = new Decimal(0);
  let sgstAmount = new Decimal(0);
  let igstRate = new Decimal(0);
  let igstAmount = new Decimal(0);

  if (isInterState) {
    igstRate = totalRate;
    igstAmount = taxable.times(igstRate).dividedBy(100).toDecimalPlaces(2);
  } else {
    // 50-50 split for intra-state CGST & SGST
    cgstRate = totalRate.dividedBy(2);
    sgstRate = totalRate.dividedBy(2);
    cgstAmount = taxable.times(cgstRate).dividedBy(100).toDecimalPlaces(2);
    sgstAmount = taxable.times(sgstRate).dividedBy(100).toDecimalPlaces(2);
  }

  const totalTax = cgstAmount.plus(sgstAmount).plus(igstAmount);
  const totalAmount = taxable.plus(totalTax);

  return {
    isInterState,
    taxableAmount: taxable,
    gstRate: totalRate,
    cgstRate,
    cgstAmount,
    sgstRate,
    sgstAmount,
    igstRate,
    igstAmount,
    totalTax,
    totalAmount,
  };
}

export const COMMON_ROOFING_HSN_SAC = [
  { code: "9954", description: "Works Contract Services - PEB Industrial Shed & Roof Erection", rate: 18, defaultUnit: "SQFT" },
  { code: "995468", description: "Roofing, Water-Proofing & Specialized Cladding Installation", rate: 18, defaultUnit: "SQFT" },
  { code: "7210", description: "Colour Coated Galvalume / Galvanized Roofing Sheets (0.45mm / 0.50mm)", rate: 18, defaultUnit: "SQFT" },
  { code: "7308", description: "Fabricated Structural Steel Truss, Purlins, Sag Rods, Columns & Bracings", rate: 18, defaultUnit: "MT" },
  { code: "6905", description: "Clay Roofing Tiles, Mangalore Tiles & Ridge Caps", rate: 12, defaultUnit: "NOS" },
  { code: "8414", description: "Polycarbonate Skylight Sheets & Roof Wind Turbo Ventilators", rate: 18, defaultUnit: "NOS" },
  { code: "7318", description: "Self-Drilling Screws, Fasteners, EPDM Washers & Sealants", rate: 18, defaultUnit: "NOS" },
];

export const INDIAN_STATES: Record<string, string> = {
  "33": "Tamil Nadu",
  "32": "Kerala",
  "29": "Karnataka",
  "37": "Andhra Pradesh",
  "36": "Telangana",
  "27": "Maharashtra",
  "34": "Puducherry",
  "07": "Delhi",
  "09": "Uttar Pradesh",
  "24": "Gujarat",
};
