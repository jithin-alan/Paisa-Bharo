"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
exports.getUserRef = getUserRef;
exports.isAdminUser = isAdminUser;
exports.isValidTimezone = isValidTimezone;
exports.resolveTimezone = resolveTimezone;
exports.getDateInTimezone = getDateInTimezone;
exports.getDaysDifference = getDaysDifference;
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-admin/firestore");
const FIRESTORE_DATABASE_ID = "ai-studio-ba803483-ddcf-496c-b3c9-7d1a85fc5692";
const app = admin.apps.length ? admin.app() : admin.initializeApp();
exports.db = (0, firestore_1.getFirestore)(app, FIRESTORE_DATABASE_ID);
/**
 * Helper to get user document reference
 */
function getUserRef(userId) {
    return exports.db.collection("users").doc(userId);
}
/**
 * Helper to check if user is admin via custom claims
 * @param context - The auth context (request.auth from callable functions)
 */
function isAdminUser(context) {
    return context?.token?.admin === true;
}
/**
 * Checks if a string is a valid IANA timezone name.
 */
function isValidTimezone(tz) {
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
function resolveTimezone(requestedTz, userProfileTz, userCountry) {
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
function getDateInTimezone(date, timeZone) {
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
function getDaysDifference(dateStr1, dateStr2) {
    const d1 = new Date(dateStr1 + "T00:00:00Z");
    const d2 = new Date(dateStr2 + "T00:00:00Z");
    const diffTime = d2.getTime() - d1.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
}
//# sourceMappingURL=helpers.js.map