"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WorkoutSummaryCard } from "@/components/workout/workout-summary-card";
import { useSession } from "@/lib/auth-client";

interface WorkoutSummaryData {
  exerciseType: string;
  totalReps: number;
  goodFormReps: number;
  badFormReps: number;
  durationSeconds: number;
  mistakes: string[];
}

function SummaryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  const [summaryData, setSummaryData] = useState<WorkoutSummaryData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Parse summary data from URL
  useEffect(() => {
    const dataParam = searchParams.get("data");
    if (dataParam) {
      try {
        const parsed = JSON.parse(decodeURIComponent(dataParam));
        setSummaryData(parsed);
      } catch (e) {
        console.error("Failed to parse workout data:", e);
      }
    }
  }, [searchParams]);

  // Save workout to database
  const handleSave = async () => {
    if (!summaryData || !session) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      const response = await fetch("/api/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(summaryData),
      });

      if (!response.ok) {
        throw new Error("Failed to save workout");
      }

      setSaved(true);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to save workout");
    } finally {
      setIsSaving(false);
    }
  };

  // Start new workout
  const handleStartNew = () => {
    router.push("/workout");
  };

  // No data - redirect to workout selection
  if (!summaryData) {
    return (
      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">No Workout Data</h1>
          <p className="text-muted-foreground mb-6">
            It looks like you haven&apos;t completed a workout yet.
          </p>
          <Button asChild>
            <Link href="/workout">Start a Workout</Link>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 container mx-auto px-4 py-12">
      <div className="max-w-md mx-auto">
        <Button variant="ghost" size="sm" asChild className="mb-6">
          <Link href="/workout">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Exercises
          </Link>
        </Button>

        <WorkoutSummaryCard
          exerciseType={summaryData.exerciseType}
          totalReps={summaryData.totalReps}
          goodFormReps={summaryData.goodFormReps}
          badFormReps={summaryData.badFormReps}
          durationSeconds={summaryData.durationSeconds}
          mistakes={summaryData.mistakes}
          {...(session && !saved ? { onSave: handleSave } : {})}
          onStartNew={handleStartNew}
          isSaving={isSaving}
        />

        {/* Save error */}
        {saveError && (
          <p className="text-red-500 text-sm text-center mt-4">{saveError}</p>
        )}

        {/* Save success */}
        {saved && (
          <div className="text-center mt-4">
            <p className="text-green-500 text-sm mb-2">Workout saved!</p>
            <Button variant="link" asChild>
              <Link href="/history">View History</Link>
            </Button>
          </div>
        )}

        {/* Login prompt for guests */}
        {!session && (
          <div className="mt-6 p-4 border rounded-lg text-center">
            <p className="text-sm text-muted-foreground mb-3">
              Sign in to save your workout history
            </p>
            <Button variant="outline" asChild>
              <Link href="/login">
                <LogIn className="h-4 w-4 mr-2" />
                Sign In
              </Link>
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}

export default function WorkoutSummaryPage() {
  return (
    <Suspense
      fallback={
        <main className="flex-1 container mx-auto px-4 py-12">
          <div className="max-w-md mx-auto text-center">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </main>
      }
    >
      <SummaryContent />
    </Suspense>
  );
}
