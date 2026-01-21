"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface WorkoutHistoryItem {
  id: string;
  exerciseType: string;
  totalReps: number;
  goodFormReps: number;
  badFormReps: number;
  durationSeconds: number;
  mistakes: string[];
  createdAt: Date | string;
}

interface HistoryListProps {
  workouts: WorkoutHistoryItem[];
  className?: string;
}

function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
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

export function HistoryList({ workouts, className }: HistoryListProps) {
  if (workouts.length === 0) {
    return (
      <Card className={cn("text-center", className)}>
        <CardContent className="py-12">
          <p className="text-muted-foreground">No workouts saved yet.</p>
          <p className="text-sm text-muted-foreground mt-2">
            Complete a workout and save it to see your history here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {workouts.map((workout) => {
        const formPercentage = getFormPercentage(
          workout.goodFormReps,
          workout.totalReps
        );

        return (
          <Card key={workout.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="capitalize text-lg">
                  {workout.exerciseType}
                </CardTitle>
                <Badge
                  variant={formPercentage >= 70 ? "default" : "secondary"}
                  className={cn(
                    formPercentage >= 70 && "bg-green-500 hover:bg-green-500"
                  )}
                >
                  {formPercentage}% Good Form
                </Badge>
              </div>
              <CardDescription>{formatDate(workout.createdAt)}</CardDescription>
            </CardHeader>

            <CardContent>
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold">{workout.totalReps}</div>
                  <div className="text-xs text-muted-foreground">Reps</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-500">
                    {workout.goodFormReps}
                  </div>
                  <div className="text-xs text-muted-foreground">Good</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-500">
                    {workout.badFormReps}
                  </div>
                  <div className="text-xs text-muted-foreground">Bad</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {formatDuration(workout.durationSeconds)}
                  </div>
                  <div className="text-xs text-muted-foreground">Time</div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
