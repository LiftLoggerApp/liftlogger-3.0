import { Button } from "@/components/ui/button";
import { Dumbbell } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-950/20 via-transparent to-transparent pointer-events-none" />
      
      <div className="relative z-10 flex flex-col items-center text-center max-w-md">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center mb-8 shadow-2xl shadow-red-500/25">
          <Dumbbell className="w-10 h-10 text-white" />
        </div>
        
        <h1 className="text-4xl font-bold tracking-tight mb-3">
          LiftLogger
        </h1>
        
        <p className="text-neutral-400 text-lg mb-8">
          Track your workouts. Build your strength.
        </p>

        <div className="flex flex-col gap-3 w-full">
          <Button asChild size="lg" className="w-full">
            <Link href="/login">Get Started</Link>
          </Button>
          
          <Button asChild variant="outline" size="lg" className="w-full">
            <Link href="/login">Sign In</Link>
          </Button>
        </div>
      </div>

      <footer className="absolute bottom-6 text-neutral-600 text-sm">
        Your gains, tracked.
      </footer>
    </main>
  );
}
