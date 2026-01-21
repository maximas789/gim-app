"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { VOICE_FEEDBACK, type FormIssue } from "@/lib/form-checker";
import { cn } from "@/lib/utils";

interface WorkoutSummaryProps {
  exerciseType: string;
  totalReps: number;
  goodFormReps: number;
  badFormReps: number;
  durationSeconds: number;
  mistakes: string[];
  onSave?: () => void | Promise<void>;
  onStartNew: () => void;
  isSaving?: boolean;
  className?: string;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) {
    return `${secs}s`;
  }
  return `${mins}m ${secs}s`;
}

function getFormPercentage(good: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((good / total) * 100);
}

export function WorkoutSummaryCard({
  exerciseType,
  totalReps,
  goodFormReps,
  badFormReps,
  durationSeconds,
  mistakes,
  onSave,
  onStartNew,
  isSaving = false,
  className,
}: WorkoutSummaryProps) {
  const formPercentage = getFormPercentage(goodFormReps, totalReps);

  return (
    <Card className={cn("w-full max-w-md", className)}>
      <CardHeader className="text-center">
        <CardTitle className="capitalize text-2xl">
          {exerciseType} Workout Complete
        </CardTitle>
        <CardDescription>Great job! Here&apos;s your summary</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Main stats */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-4xl font-bold">{totalReps}</div>
            <div className="text-sm text-muted-foreground">Total Reps</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-green-500">
              {formPercentage}%
            </div>
            <div className="text-sm text-muted-foreground">Good Form</div>
          </div>
          <div>
            <div className="text-4xl font-bold">
              {formatDuration(durationSeconds)}
            </div>
            <div className="text-sm text-muted-foreground">Duration</div>
          </div>
        </div>

        {/* Form breakdown */}
        <div className="flex justify-center gap-8">
          <div className="text-center">
            <div className="text-2xl font-semibold text-green-500">
              {goodFormReps}
            </div>
            <div className="text-xs text-muted-foreground">Good Form Reps</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-semibold text-red-500">
              {badFormReps}
            </div>
            <div className="text-xs text-muted-foreground">Bad Form Reps</div>
          </div>
        </div>

        {/* Mistakes summary */}
        {mistakes.length > 0 && (
          <div className="border-t pt-4">
            <h4 className="font-medium mb-2">Areas to Improve</h4>
            <ul className="space-y-1">
              {mistakes.map((mistake) => (
                <li
                  key={mistake}
                  className="text-sm text-muted-foreground flex items-center gap-2"
                >
                  <span className="text-yellow-500">•</span>
                  {VOICE_FEEDBACK[mistake as FormIssue] || mistake}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex flex-col gap-3">
        {onSave && (
          <Button
            onClick={onSave}
            disabled={isSaving}
            className="w-full"
          >
            {isSaving ? "Saving..." : "Save Workout"}
          </Button>
        )}
        <Button variant="outline" onClick={onStartNew} className="w-full">
          Start New Workout
        </Button>
      </CardFooter>
    </Card>
  );
}
