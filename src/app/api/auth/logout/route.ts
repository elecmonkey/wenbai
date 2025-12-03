import { NextResponse } from "next/server";
import { AUTH_COOKIE_BASE } from "@/lib/auth";

export const runtime = 'nodejs';

export async function POST() {
  const response = NextResponse.json({ message: "success" });
  response.cookies.set({
    ...AUTH_COOKIE_BASE,
    value: "",
    maxAge: 0,
  });
  return response;
}
