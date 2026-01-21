
export const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
export const PHONE_REGEX = /\b(?:\+?(\d{1,3}))?[-. (]*(\d{3})[-. )]*(\d{3})[-. ]*(\d{4})\b/g;
// Basic attempt to catch long numbers (like credit cards or IDs) 8+ digits
export const LONG_NUMBER_REGEX = /\b\d{8,}\b/g;

export function maskPII(text: string): string {
    if (!text) return text;
    let masked = text;
    masked = masked.replace(EMAIL_REGEX, "[EMAIL]");
    masked = masked.replace(PHONE_REGEX, "[PHONE]");
    masked = masked.replace(LONG_NUMBER_REGEX, "[NUMBER]");
    return masked;
}

export function maskObject(obj: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
    for (const key in obj) {
        if (typeof obj[key] === "string") {
            result[key] = maskPII(obj[key]);
        } else if (typeof obj[key] === "object" && obj[key] !== null) {
            result[key] = maskObject(obj[key]);
        } else {
            result[key] = obj[key];
        }
    }
    return result;
}
