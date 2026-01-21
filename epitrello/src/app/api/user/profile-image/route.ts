import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { v2 as cloudinary } from "cloudinary";

import { prisma } from "@/app/lib/prisma";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;

    if (!userId && !session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: userId ? { id: userId } : { email: session?.user?.email as string },
      select: {
        id: true,
        email: true,
        name: true,
        profileImage: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      profileImage: user.profileImage,
      user,
    });
  } catch (error) {
    console.error("Error fetching profile image:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile image" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;

    if (!userId && !session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: userId ? { id: userId } : { email: session?.user?.email as string },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp", "image/gif"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed." },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5MB." },
        { status: 400 }
      );
    }

    // Convert file to buffer and then to data URI for Base64 upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString("base64");
    const fileUri = `data:${file.type};base64,${base64Data}`;

    // Upload to Cloudinary
    const uploadResponse = await cloudinary.uploader.upload(fileUri, {
      folder: "epitrello/profiles",
      public_id: `user_${user.id}`, // Overwrite existing image for this user
      overwrite: true,
      transformation: [
        { width: 400, height: 400, crop: "fill", gravity: "face" }, // Auto-crop to face
        { quality: "auto", fetch_format: "auto" }
      ]
    });

    const imageUrl = uploadResponse.secure_url;

    // Update user profile image in database
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { profileImage: imageUrl },
      select: {
        id: true,
        email: true,
        name: true,
        profileImage: true,
      },
    });

    return NextResponse.json({
      message: "Profile image uploaded successfully",
      profileImage: imageUrl,
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error uploading profile image:", error);
    return NextResponse.json(
      { error: "Failed to upload profile image" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;

    if (!userId && !session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: userId ? { id: userId } : { email: session?.user?.email as string },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // If implementing cleanup, we would delete from Cloudinary here:
    // cloudinary.uploader.destroy(`epitrello/profiles/user_${user.id}`);

    // Update user to remove profile image
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { profileImage: null },
      select: {
        id: true,
        email: true,
        name: true,
        profileImage: true,
      },
    });

    return NextResponse.json({
      message: "Profile image removed successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error removing profile image:", error);
    return NextResponse.json(
      { error: "Failed to remove profile image" },
      { status: 500 }
    );
  }
}



