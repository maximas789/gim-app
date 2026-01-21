import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { workout } from "@/lib/schema";

const workoutSchema = z.object({
  exerciseType: z.enum(["squat", "deadlift"]),
  totalReps: z.number().int().min(0),
  goodFormReps: z.number().int().min(0),
  badFormReps: z.number().int().min(0),
  durationSeconds: z.number().int().min(0),
  mistakes: z.array(z.string()),
});

// POST - Save a workout (requires auth)
export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = workoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const [inserted] = await db
    .insert(workout)
    .values({
      userId: session.user.id,
      ...parsed.data,
    })
    .returning();

  return NextResponse.json(inserted);
}

// GET - List user's workouts (requires auth)
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workouts = await db
    .select()
    .from(workout)
    .where(eq(workout.userId, session.user.id))
    .orderBy(desc(workout.createdAt))
    .limit(50);

  return NextResponse.json(workouts);
}
