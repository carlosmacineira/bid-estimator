import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { unlink } from "fs/promises";
import path from "path";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const { id, docId } = await params;

    const document = await prisma.document.findFirst({
      where: { id: docId, projectId: id },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Delete file from disk
    try {
      const absolutePath = path.join(process.cwd(), "public", document.filePath);
      await unlink(absolutePath);
    } catch {
      // File may already be deleted from disk; continue with record deletion
    }

    // Delete database record
    await prisma.document.delete({
      where: { id: docId },
    });

    return NextResponse.json({ message: "Document deleted successfully" });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 }
    );
  }
}
