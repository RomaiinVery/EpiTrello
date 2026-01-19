import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { sendVerificationCode } from "@/app/lib/email";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, name } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Request email and password" },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email already taken" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate 6 digit code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        verificationCode,
      },
    });

    const emailSent = await sendVerificationCode(email, verificationCode);

    if (!emailSent) {
      // Optional: rollback user creation or just warn? 
      // For now we assume user can ask for resend if needed, or we just log it.
      console.error("Failed to send verification email");
    }

    return NextResponse.json(
      {
        message: "Account created. Please verify your email.",
        email: user.email,
        verificationNeeded: true
      },
      { status: 201 }
    );

  } catch (error) {
    console.error("Register Error:", error);
    return NextResponse.json(
      { error: "Error creating account" },
      { status: 500 }
    );
  }
}