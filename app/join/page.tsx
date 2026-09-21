import { JoinForm } from "./join-form";

export default function JoinPage() {
  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-sm flex-col gap-6 px-6 py-24">
        <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Join a game
        </h1>
        <JoinForm />
      </main>
    </div>
  );
}
