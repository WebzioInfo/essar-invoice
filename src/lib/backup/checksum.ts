// checksum.ts - Cryptographic integrity hashing for backup files and manifests
import crypto from "crypto";

/**
 * Computes SHA-256 hex string for a given Buffer or string.
 */
export function computeSha256(data: Buffer | string): string {
    const hash = crypto.createHash("sha256");
    if (typeof data === "string") {
        hash.update(data, "utf8");
    } else {
        hash.update(data);
    }
    return hash.digest("hex");
}

/**
 * Verifies if the data matches the expected SHA-256 hex string.
 */
export function verifySha256(data: Buffer | string, expectedHash: string): boolean {
    const actualHash = computeSha256(data);
    return actualHash.toLowerCase() === expectedHash.toLowerCase();
}
