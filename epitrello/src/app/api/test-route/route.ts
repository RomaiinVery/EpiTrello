import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ message: "Test route works!" });
}

export async function POST(req: Request) {
  const body = await req.json();
  return NextResponse.json({ received: body }, { status: 201 });
}


