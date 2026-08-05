import { PrismaClient } from '@prisma/client'
import { env } from '@/lib/env'

function buildDatasourceUrl(baseUrl: string): string {
    if (!baseUrl || (!baseUrl.startsWith("mysql://") && !baseUrl.startsWith("mysqls://"))) {
        return baseUrl;
    }
    // Avoid duplicating query parameters if already present
    if (baseUrl.includes("connection_limit=")) {
        return baseUrl;
    }
    const separator = baseUrl.includes("?") ? "&" : "?";
    return `${baseUrl}${separator}connection_limit=1&pool_timeout=30`;
}

const prismaClientSingleton = () => {
    const formattedUrl = buildDatasourceUrl(env.DATABASE_URL);
    return new PrismaClient({
        log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
        datasources: {
            db: {
                url: formattedUrl,
            },
        },
    });
};

declare const globalThis: {
    prismaGlobalV3: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

const prisma = globalThis.prismaGlobalV3 ?? prismaClientSingleton();

export default prisma;
export const db = prisma;

if (env.NODE_ENV !== 'production') {
    globalThis.prismaGlobalV3 = prisma;
}
