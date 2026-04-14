import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { validateStrongPassword } from "@/lib/password";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email ?? "").toLowerCase().trim();
    const password = String(body.password ?? "");
    const name = String(body.name ?? "").trim() || null;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required." }, { status: 400 });
    }

    const pwErr = validateStrongPassword(password);
    if (pwErr) {
      return NextResponse.json({ error: pwErr }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
      },
    });

    await prisma.userSettings.create({
      data: { userId: user.id },
    });
    await prisma.subscription.create({
      data: { userId: user.id, status: "inactive" },
    });

    await prisma.auditLog.create({
      data: { userId: user.id, action: "register", meta: JSON.stringify({ email }) },
    });

    return NextResponse.json({ ok: true, userId: user.id });
  } catch {
    return NextResponse.json({ error: "Registration failed." }, { status: 500 });
  }
}
