"use client";

import { Badge } from "@/components/ui/badge";
import { VOICE_FEEDBACK, type FormIssue } from "@/lib/form-checker";
import { cn } from "@/lib/utils";

interface FormIndicatorProps {
  isGoodForm: boolean;
  issues: FormIssue[];
  className?: string;
}

export function FormIndicator({
  isGoodForm,
  issues,
  className,
}: FormIndicatorProps) {
  return (
    <div
      className={cn(
        "bg-background/80 backdrop-blur-sm rounded-lg p-3 shadow-lg",
        className
      )}
    >
      <Badge
        variant={isGoodForm ? "default" : "destructive"}
        className={cn(
          "text-sm px-4 py-1",
          isGoodForm && "bg-green-500 hover:bg-green-500"
        )}
      >
        {isGoodForm ? "Good Form" : "Check Form"}
      </Badge>

      {issues.length > 0 && (
        <div className="mt-2 space-y-1">
          {issues.map((issue) => (
            <p key={issue} className="text-sm text-red-500 font-medium">
              {VOICE_FEEDBACK[issue]}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
