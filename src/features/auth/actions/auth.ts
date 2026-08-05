"use server";

import { z } from "zod";
import { hash, compare } from "bcryptjs";
import { db } from "@/db/prisma/client";
import { Prisma } from "@prisma/client";
import { createSessionCookie } from "@/lib/auth";
import { redirect } from "next/navigation";

const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

function handlePrismaError(error: any, actionName: string): string {
  console.error(`❌ [Auth] ${actionName} error:`, error);
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return "Database connection failed. Please ensure the database server is running and DATABASE_URL is correct.";
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code.startsWith("P100")) {
      return "Database connection unreachable. Please check database server status.";
    }
  }
  return "An unexpected server error occurred. Please try again.";
}

export async function signupAction(formData: FormData) {
  const data = Object.fromEntries(formData);
  const result = signupSchema.safeParse(data);

  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const { email, password } = result.data;

  try {
    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      return { error: "User with this email already exists" };
    }

    const passwordHash = await hash(password, 10);

    const user = await db.user.create({
      data: {
        email,
        passwordHash,
        role: "ADMIN",
      },
    });

    await createSessionCookie({
      userId: user.id,
      role: user.role,
    });

    return { success: true };
  } catch (error: any) {
    const errorMessage = handlePrismaError(error, "signupAction");
    return { error: errorMessage };
  }
}

export async function loginAction(formData: FormData) {
  const data = Object.fromEntries(formData);
  const result = loginSchema.safeParse(data);

  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const { email, password } = result.data;

  try {
    const user = await db.user.findUnique({
      where: { email },
    });

    if (!user) {
      return { error: "Invalid email or password" };
    }

    const isValid = await compare(password, user.passwordHash);
    if (!isValid) {
      return { error: "Invalid email or password" };
    }

    await createSessionCookie({
      userId: user.id,
      role: user.role,
    });

    return { success: true };
  } catch (error: any) {
    const errorMessage = handlePrismaError(error, "loginAction");
    return { error: errorMessage };
  }
}

export async function logoutAction() {
  const { destroySessionCookie } = await import("@/lib/auth");
  await destroySessionCookie();
  redirect("/login");
}
