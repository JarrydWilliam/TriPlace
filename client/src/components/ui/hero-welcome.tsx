import { User } from "@shared/schema";

export function HeroWelcome({ user }: { user: User }) {
  const hour = new Date().getHours();
  let greeting = "Good evening";
  if (hour < 12) greeting = "Good morning";
  else if (hour < 17) greeting = "Good afternoon";

  const firstName = user?.name?.split(" ")[0] || "there";

  return (
    <div className="relative pt-12 pb-6 px-4 overflow-hidden">
      {/* Background Blooms */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute -top-[100px] -left-[50px] w-[250px] h-[250px] bg-primary/20 rounded-full blur-[80px]" />
        <div className="absolute top-[20px] -right-[50px] w-[200px] h-[200px] bg-accent/20 rounded-full blur-[80px]" />
      </div>

      <div className="relative z-10">
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
          {greeting}, {firstName}!
        </h1>
        <p className="text-white/60 text-base max-w-[280px]">
          Explore local communities and upcoming experiences just for you.
        </p>
      </div>
    </div>
  );
}
