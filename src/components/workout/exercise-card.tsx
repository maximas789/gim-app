"use client";

import { Card, CardContent } from "@/components/ui/card";
import type { ExerciseType } from "@/contexts/workout-context";
import { cn } from "@/lib/utils";

interface ExerciseCardProps {
  exercise: ExerciseType;
  onSelect: () => void;
  className?: string;
}

const exerciseInfo: Record<
  ExerciseType,
  { name: string; description: string; icon: string }
> = {
  squat: {
    name: "Squat",
    description: "Lower body compound exercise",
    icon: "🏋️",
  },
  deadlift: {
    name: "Deadlift",
    description: "Full body compound exercise",
    icon: "💪",
  },
};

export function ExerciseCard({
  exercise,
  onSelect,
  className,
}: ExerciseCardProps) {
  const info = exerciseInfo[exercise];

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:scale-105 hover:shadow-lg",
        className
      )}
      onClick={onSelect}
    >
      <CardContent className="flex flex-col items-center justify-center p-8">
        <span className="text-6xl mb-4" role="img" aria-label={info.name}>
          {info.icon}
        </span>
        <h3 className="text-2xl font-bold mb-2">{info.name}</h3>
        <p className="text-muted-foreground text-center">{info.description}</p>
      </CardContent>
    </Card>
  );
}
