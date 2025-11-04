import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";

export const runtime = "edge";

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ message: "success", data: null });
    }
    return NextResponse.json({ message: "success", data: user });
  } catch (error) {
    console.error("GET /api/auth/session failed", error);
    return NextResponse.json(
      { message: "error", error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
