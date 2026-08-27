import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-24 text-center">
      <h1 className="text-2xl font-semibold">Not found</h1>
      <p className="text-sm text-muted-foreground">
        The page or record you&apos;re looking for doesn&apos;t exist, or may have been removed.
      </p>
      <Button render={<Link href="/" />}>Back to start</Button>
    </div>
  );
}
