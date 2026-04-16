"use server";

import { z } from "zod";
import * as argon2 from "argon2";

import { db } from "@/db/prisma/client";
import { Prisma } from "@prisma/client";
import { createSessionCookie } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export async function signupAction(formData: FormData) {
  const data = Object.fromEntries(formData);
  const result = signupSchema.safeParse(data);

  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const { email, password } = result.data;

  try {
    // Check if user exists
    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      return { error: "User with this email already exists" };
    }

    const passwordHash = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4
    });

    // Create User
    const user = await db.user.create({
      data: {
        email,
        passwordHash,
        role: "OWNER",
      },
    });

    await createSessionCookie({
      userId: user.id,
      role: user.role,
    });

    return { success: true };
  } catch (error: any) {
    console.error("Signup error:", error);
    return { error: "Failed to create account. Please try again." };
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

    // Verify with Argon2
    const isValid = await argon2.verify(user.passwordHash, password);

    if (!isValid) {
      return { error: "Invalid email or password" };
    }



    await createSessionCookie({
      userId: user.id,
      role: user.role,
    });

    return { success: true };
  } catch (error: any) {
    console.error("Login error:", error);
    return { error: "Something went wrong. Please try again." };
  }
}

export async function logoutAction() {
  const { destroySessionCookie } = await import("@/lib/auth");
  await destroySessionCookie();
  redirect("/login");
}
