import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";

const execAsync = promisify(exec);

const STUDIO_PATH = process.env.STUDIO_PATH || "/Users/mac/AI-Video-Studio";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const projectId = formData.get("projectId") as string;
    const file = formData.get("file") as File;

    if (!projectId || !file) {
      return NextResponse.json({ error: "Project ID and file are required" }, { status: 400 });
    }

    const projectDir = path.join(STUDIO_PATH, "projects", projectId);
    const inputDir = path.join(projectDir, "input");

    if (!fs.existsSync(projectDir)) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (!fs.existsSync(inputDir)) {
      fs.mkdirSync(inputDir, { recursive: true });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = path.join(inputDir, fileName);

    fs.writeFileSync(filePath, buffer);

    const { stdout } = await execAsync(`ffprobe -v quiet -print_format json -show_format -show_streams "${filePath}"`);
    const metadata = JSON.parse(stdout);

    const videoStream = metadata.streams?.find((s: any) => s.codec_type === "video");
    const audioStream = metadata.streams?.find((s: any) => s.codec_type === "audio");

    const mediaInfo = {
      id: fileName,
      name: fileName,
      path: filePath,
      type: videoStream ? "video" : audioStream ? "audio" : "image",
      size: file.size,
      duration: parseFloat(metadata.format.duration || "0"),
      width: videoStream?.width,
      height: videoStream?.height,
      fps: videoStream ? eval(videoStream.r_frame_rate) : undefined,
      codec: videoStream?.codec_name,
      bitrate: parseInt(metadata.format.bit_rate || "0"),
      audioTracks: audioStream ? [{
        index: audioStream.index,
        codec: audioStream.codec_name,
        channels: audioStream.channels,
        sampleRate: audioStream.sample_rate,
        language: audioStream.tags?.language,
      }] : [],
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({ media: mediaInfo });
  } catch (error) {
    console.error("Error uploading media:", error);
    return NextResponse.json({ error: "Failed to upload media" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json({ error: "Project ID required" }, { status: 400 });
    }

    const projectDir = path.join(STUDIO_PATH, "projects", projectId);
    const inputDir = path.join(projectDir, "input");

    if (!fs.existsSync(inputDir)) {
      return NextResponse.json({ media: [] });
    }

    const files = fs.readdirSync(inputDir);
    const media = [];

    for (const file of files) {
      const filePath = path.join(inputDir, file);
      const stats = fs.statSync(filePath);

      try {
        const { stdout } = await execAsync(`ffprobe -v quiet -print_format json -show_format -show_streams "${filePath}"`);
        const metadata = JSON.parse(stdout);

        const videoStream = metadata.streams?.find((s: any) => s.codec_type === "video");
        const audioStream = metadata.streams?.find((s: any) => s.codec_type === "audio");

        media.push({
          id: file,
          name: file,
          path: filePath,
          type: videoStream ? "video" : audioStream ? "audio" : "image",
          size: stats.size,
          duration: parseFloat(metadata.format.duration || "0"),
          width: videoStream?.width,
          height: videoStream?.height,
          fps: videoStream ? eval(videoStream.r_frame_rate) : undefined,
          codec: videoStream?.codec_name,
          bitrate: parseInt(metadata.format.bit_rate || "0"),
          createdAt: stats.birthtime.toISOString(),
        });
      } catch {
        media.push({
          id: file,
          name: file,
          path: filePath,
          type: "unknown",
          size: stats.size,
          duration: 0,
          createdAt: stats.birthtime.toISOString(),
        });
      }
    }

    return NextResponse.json({ media });
  } catch (error) {
    console.error("Error listing media:", error);
    return NextResponse.json({ error: "Failed to list media" }, { status: 500 });
  }
}