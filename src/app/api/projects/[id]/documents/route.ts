import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const documents = await prisma.document.findMany({
      where: { projectId: id },
      select: {
        id: true,
        projectId: true,
        fileName: true,
        fileSize: true,
        fileType: true,
        filePath: true,
        tag: true,
        notes: true,
        createdAt: true,
        // Exclude fileData from listing to keep response small
      },
    });

    return NextResponse.json(documents);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const tag = (formData.get("tag") as string) || null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Store file data as base64 in the database for cloud compatibility
    const fileDataBase64 = buffer.toString("base64");

    // Also try to write to local filesystem (works in dev, may fail in production)
    let relativePath = `/uploads/${id}/${file.name}`;
    try {
      const uploadDir = path.join(process.cwd(), "public", "uploads", id);
      await mkdir(uploadDir, { recursive: true });
      const filePath = path.join(uploadDir, file.name);
      await writeFile(filePath, buffer);
    } catch {
      // In production (Vercel), filesystem writes may fail — that's OK
      // We have the file data stored in the database
      relativePath = `/db-stored/${id}/${file.name}`;
    }

    const document = await prisma.document.create({
      data: {
        projectId: id,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        filePath: relativePath,
        fileData: fileDataBase64,
        tag,
      },
    });

    // Return without fileData to keep response small
    return NextResponse.json(
      {
        id: document.id,
        projectId: document.projectId,
        fileName: document.fileName,
        fileSize: document.fileSize,
        fileType: document.fileType,
        filePath: document.filePath,
        tag: document.tag,
        notes: document.notes,
        createdAt: document.createdAt,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Document upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload document" },
      { status: 500 }
    );
  }
}
