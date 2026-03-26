import { Spinner } from "@/components/ui/spinner";

export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex items-center gap-3 rounded-2xl border border-[#e4d7ba] bg-[#fffdf8] px-5 py-4">
        <Spinner />
        <p className="text-sm text-[#847962]">Loading workspace...</p>
      </div>
    </div>
  );
}
