import { NextRequest, NextResponse } from 'next/server';
import * as argon2 from 'argon2';
import prisma from '@/db/prisma/client';
import { registerSchema } from '@/lib/schemas/authSchema';
import { createSessionCookie } from '@/lib/auth';



export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const data = registerSchema.parse(body);

        // Check if user exists
        const existingUser = await prisma.user.findUnique({
            where: { email: data.email }
        });

        if (existingUser) {
            return NextResponse.json({ error: 'Email already in use' }, { status: 400 });
        }

        const hashedPassword = await argon2.hash(data.password, {
            type: argon2.argon2id,
            memoryCost: 65536,
            timeCost: 3,
            parallelism: 4
        });

        // Create Admin User
        const user = await prisma.user.create({
            data: {
                email: data.email,
                passwordHash: hashedPassword,
                role: 'ADMIN' // First user is Admin
            }
        });

        await createSessionCookie({
            userId: user.id,
            role: user.role
        });
        
        return NextResponse.json({ success: true, role: user.role }, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
