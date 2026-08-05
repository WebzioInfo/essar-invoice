import { z } from "zod";

const envSchema = z.object({
    DATABASE_URL: z.string().refine(
        (url) => url.startsWith("mysql://") || url.startsWith("mysqls://"),
        { message: "DATABASE_URL must start with mysql:// or mysqls://" }
    ),
    JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters long"),
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build' || process.env.NODE_ENV === 'test';

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    if (isBuildPhase) {
        console.warn("⚠️ [ENV] Essential environment variables missing during build phase. Using safe MySQL mock values to allow build completion.");
    } else {
        console.error("❌ [ENV] Invalid or missing environment variables:");
        const errors = parsed.error.flatten().fieldErrors;
        for (const [field, messages] of Object.entries(errors)) {
            console.error(`   - ${field}: ${messages?.join(", ")}`);
        }
        console.error("❌ [ENV] Database and Authentication features will fail until these variables are provided in .env or environment.");
    }
}

const buildMockDbUrl = "mysql://mock:mock@localhost:3306/mock_db";
const defaultDevDbUrl = "mysql://root:password@localhost:3306/essar_erp";
const defaultDevJwtSecret = "essar_erp_super_secret_jwt_key_32_chars_min_2026";

const rawDbUrl = process.env.DATABASE_URL || "";
const isValidDbUrl = rawDbUrl.startsWith("mysql://") || rawDbUrl.startsWith("mysqls://");

const safeDbUrl = parsed.success
    ? parsed.data.DATABASE_URL
    : isValidDbUrl
        ? rawDbUrl
        : isBuildPhase
            ? buildMockDbUrl
            : defaultDevDbUrl;

const safeJwtSecret = parsed.success
    ? parsed.data.JWT_SECRET
    : (process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32)
        ? process.env.JWT_SECRET
        : defaultDevJwtSecret;

export const env = {
    DATABASE_URL: safeDbUrl,
    JWT_SECRET: safeJwtSecret,
    NODE_ENV: (process.env.NODE_ENV as "development" | "test" | "production") || "development",
};