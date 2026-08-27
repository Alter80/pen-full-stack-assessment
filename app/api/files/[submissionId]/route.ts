import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { errorResponse, ApiError } from "@/lib/api-error";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { UPLOADS_DIR, contentTypeForExt } from "@/lib/uploads";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ submissionId: string }> }) {
  const { submissionId } = await params;
  try {
    const session = await getSession();
    if (!session) throw new ApiError(401, "Sign in required.");

    const submission = await prisma.submission.findUnique({ where: { id: submissionId } });
    if (!submission) throw new ApiError(404, "Submission not found.");

    const isOwner = session.role === "student" && session.studentDbId === submission.studentId;
    if (session.role !== "staff" && !isOwner) {
      throw new ApiError(403, "You don't have access to this file.");
    }

    const buffer = await readFile(path.join(UPLOADS_DIR, submission.fileUrl));
    const ext = path.extname(submission.fileUrl);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentTypeForExt(ext),
        "Content-Disposition": `inline; filename="${submission.fileName.replace(/"/g, "")}"`,
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
