import * as admin from "firebase-admin";
admin.initializeApp();
export const db = admin.firestore();
/**
 * Helper to get user document reference
 */
export function getUserRef(userId) {
    return db.collection("users").doc(userId);
}
/**
 * Helper to check if user is admin via custom claims
 * @param context - The auth context (request.auth from callable functions)
 */
export function isAdminUser(context) {
    return context?.token?.admin === true;
}
/**
 * Checks if a string is a valid IANA timezone name.
 */
export function isValidTimezone(tz) {
    if (!tz || typeof tz !== "string" || tz.length > 64)
        return false;
    try {
        Intl.DateTimeFormat(undefined, { timeZone: tz });
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Mapping of country codes to representative primary timezones
 */
const COUNTRY_TIMEZONE_MAP = {
    IN: "Asia/Kolkata",
    US: "America/New_York",
    GB: "Europe/London",
    UK: "Europe/London",
    CA: "America/Toronto",
    AU: "Australia/Sydney",
    DE: "Europe/Berlin",
    FR: "Europe/Paris",
    JP: "Asia/Tokyo",
    BR: "America/Sao_Paulo",
    AE: "Asia/Dubai",
    SG: "Asia/Singapore",
    ZA: "Africa/Johannesburg",
    MX: "America/Mexico_City",
};
/**
 * Resolves the appropriate timezone for a user request
 */
export function resolveTimezone(requestedTz, userProfileTz, userCountry) {
    if (isValidTimezone(requestedTz)) {
        return requestedTz;
    }
    if (isValidTimezone(userProfileTz)) {
        return userProfileTz;
    }
    if (userCountry && typeof userCountry === "string") {
        const code = userCountry.trim().toUpperCase();
        if (COUNTRY_TIMEZONE_MAP[code]) {
            return COUNTRY_TIMEZONE_MAP[code];
        }
    }
    return "UTC";
}
/**
 * Formats a Date object into YYYY-MM-DD in the specified timezone
 */
export function getDateInTimezone(date, timeZone) {
    try {
        const formatter = new Intl.DateTimeFormat("en-CA", {
            timeZone,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        });
        return formatter.format(date);
    }
    catch {
        return date.toISOString().split("T")[0];
    }
}
/**
 * Calculates calendar day difference (dateStr2 - dateStr1) in integer days.
 * E.g., ('2026-11-10', '2026-11-11') => 1 day
 */
export function getDaysDifference(dateStr1, dateStr2) {
    const d1 = new Date(dateStr1 + "T00:00:00Z");
    const d2 = new Date(dateStr2 + "T00:00:00Z");
    const diffTime = d2.getTime() - d1.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
}
//# sourceMappingURL=helpers.js.map