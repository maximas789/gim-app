import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { eq, desc } from "drizzle-orm";
import { ArrowLeft, Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HistoryList } from "@/components/workout/history-list";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { workout } from "@/lib/schema";

export default async function HistoryPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/login");
  }

  // Fetch user's workouts
  const workouts = await db
    .select()
    .from(workout)
    .where(eq(workout.userId, session.user.id))
    .orderBy(desc(workout.createdAt))
    .limit(50);

  // Transform the data for the HistoryList component
  const workoutHistory = workouts.map((w) => ({
    id: w.id,
    exerciseType: w.exerciseType,
    totalReps: w.totalReps,
    goodFormReps: w.goodFormReps,
    badFormReps: w.badFormReps,
    durationSeconds: w.durationSeconds,
    mistakes: (w.mistakes as string[]) || [],
    createdAt: w.createdAt,
  }));

  return (
    <main className="flex-1 container mx-auto px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <Button variant="ghost" size="sm" asChild className="mb-4">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">Workout History</h1>
          <p className="text-muted-foreground mt-2">
            Your saved workout sessions
          </p>
        </div>

        <HistoryList workouts={workoutHistory} />

        {workoutHistory.length > 0 && (
          <div className="mt-8 text-center">
            <Button asChild>
              <Link href="/workout">
                <Dumbbell className="h-4 w-4 mr-2" />
                Start New Workout
              </Link>
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}
