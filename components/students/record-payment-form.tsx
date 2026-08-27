"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RecordPaymentForm({ studentId }: { studentId: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrors({});
    setFormError(null);

    const formData = new FormData(event.currentTarget);
    const body = {
      amount: formData.get("amount"),
      paymentDate: formData.get("paymentDate"),
      referenceNumber: formData.get("referenceNumber"),
    };

    try {
      const res = await fetch(`/api/students/${studentId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.details) setErrors(data.details);
        setFormError(data.error ?? "Could not record the payment.");
        return;
      }

      toast.success("Payment recorded");
      event.currentTarget.reset();
      router.refresh();
    } catch {
      setFormError("Network error - please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      {formError && <p className="w-full text-sm text-destructive">{formError}</p>}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="amount">Amount</Label>
        <Input id="amount" name="amount" type="number" step="0.01" min={0} required className="w-32" />
        {errors.amount && <p className="text-xs text-destructive">{errors.amount[0]}</p>}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="paymentDate">Payment date</Label>
        <Input
          id="paymentDate"
          name="paymentDate"
          type="date"
          required
          defaultValue={new Date().toISOString().slice(0, 10)}
        />
        {errors.paymentDate && <p className="text-xs text-destructive">{errors.paymentDate[0]}</p>}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="referenceNumber">Reference number</Label>
        <Input id="referenceNumber" name="referenceNumber" placeholder="e.g. TXN-00123" required className="w-40" />
        {errors.referenceNumber && <p className="text-xs text-destructive">{errors.referenceNumber[0]}</p>}
      </div>
      <Button type="submit" disabled={submitting}>
        {submitting ? "Recording…" : "Record Payment"}
      </Button>
    </form>
  );
}
