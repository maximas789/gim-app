"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExerciseCard } from "@/components/workout/exercise-card";
import type { ExerciseType } from "@/contexts/workout-context";

export default function WorkoutPage() {
  const router = useRouter();

  const handleSelectExercise = (exercise: ExerciseType) => {
    router.push(`/workout/${exercise}`);
  };

  return (
    <main className="flex-1 container mx-auto px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <Button variant="ghost" size="sm" asChild className="mb-4">
            <Link href="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">Choose Exercise</h1>
          <p className="text-muted-foreground mt-2">
            Select the exercise you want to perform with AI form analysis
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ExerciseCard
            exercise="squat"
            onSelect={() => handleSelectExercise("squat")}
          />
          <ExerciseCard
            exercise="deadlift"
            onSelect={() => handleSelectExercise("deadlift")}
          />
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            Position your camera so your full body is visible.
            <br />
            Stand sideways for best form detection results.
          </p>
        </div>
      </div>
    </main>
  );
}
