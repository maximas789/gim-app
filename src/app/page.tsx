import Link from "next/link";
import { Dumbbell, Activity, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex-1 container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto text-center space-y-8">
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10">
              <Dumbbell className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary/90 to-primary/70 bg-clip-text text-transparent">
              GymCoach
            </h1>
          </div>
          <h2 className="text-2xl font-semibold text-muted-foreground">
            AI-Powered Form Analysis
          </h2>
          <p className="text-xl text-muted-foreground">
            Real-time voice feedback for squats and deadlifts using computer vision
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <div className="p-6 border rounded-lg">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Pose Detection
            </h3>
            <p className="text-sm text-muted-foreground">
              MediaPipe-powered skeleton tracking for accurate form analysis
            </p>
          </div>
          <div className="p-6 border rounded-lg">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Mic className="h-4 w-4" />
              Voice Feedback
            </h3>
            <p className="text-sm text-muted-foreground">
              Real-time spoken corrections to improve your technique
            </p>
          </div>
          <div className="p-6 border rounded-lg">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Dumbbell className="h-4 w-4" />
              Rep Counting
            </h3>
            <p className="text-sm text-muted-foreground">
              Automatic rep counting with good/bad form tracking
            </p>
          </div>
        </div>

        <div className="space-y-4 mt-12">
          <Button asChild size="lg" className="text-lg px-8">
            <Link href="/workout">Start Workout</Link>
          </Button>
          <p className="text-sm text-muted-foreground">
            No account required to try. Sign in to save your workout history.
          </p>
        </div>
      </div>
    </main>
  );
}
