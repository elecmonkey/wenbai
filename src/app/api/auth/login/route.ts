import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { AUTH_COOKIE_BASE, SEVEN_DAYS_IN_SECONDS, signAuthToken } from "@/lib/auth";

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const username =
      typeof body?.username === "string" ? body.username.trim() : "";
    const password =
      typeof body?.password === "string" ? body.password : "";

    if (!username || !password) {
      return NextResponse.json(
        { message: "error", error: "缺少用户名或密码" },
        { status: 400 },
      );
    }

    if (!process.env.AUTH_SECRET) {
      console.error("AUTH_SECRET is not configured");
      return NextResponse.json(
        { message: "error", error: "认证服务未准备就绪，请联系管理员配置安全密钥。" },
        { status: 500 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { username },
      // cacheStrategy: { ttl: 0 },
      select: {
        id: true,
        username: true,
        displayName: true,
        passwordHash: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { message: "error", error: "用户名或密码错误" },
        { status: 401 },
      );
    }

    let valid = false;
    try {
      valid = await bcrypt.compare(password, user.passwordHash);
    } catch (compareError) {
      console.error("bcrypt compare failed", compareError);
    }
    if (!valid) {
      return NextResponse.json(
        { message: "error", error: "用户名或密码错误" },
        { status: 401 },
      );
    }

    const payload = {
      id: user.id,
      username: user.username,
      displayName: user.displayName ?? null,
    };
    const token = await signAuthToken(payload);

    const response = NextResponse.json({
      message: "success",
      data: payload,
    });
    response.cookies.set({
      ...AUTH_COOKIE_BASE,
      value: token,
      maxAge: SEVEN_DAYS_IN_SECONDS,
    });
    return response;
  } catch (error) {
    console.error("POST /api/auth/login failed", error);
    return NextResponse.json(
      { message: "error", error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
