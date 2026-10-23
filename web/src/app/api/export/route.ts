import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";

const execAsync = promisify(exec);

const STUDIO_PATH = process.env.STUDIO_PATH || "/Users/mac/AI-Video-Studio";

const VALID_TARGETS = ["fcp", "davinci", "after_effects", "daw_audio", "universal"];
const VALID_MODES = ["timeline", "render"];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, target, mode = "timeline", preset } = body;

    if (!projectId) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
    }

    if (!target || !VALID_TARGETS.includes(target)) {
      return NextResponse.json({ error: `Invalid target. Must be one of: ${VALID_TARGETS.join(", ")}` }, { status: 400 });
    }

    if (!VALID_MODES.includes(mode)) {
      return NextResponse.json({ error: `Invalid mode. Must be one of: ${VALID_MODES.join(", ")}` }, { status: 400 });
    }

    const projectDir = path.join(STUDIO_PATH, "projects", projectId);

    if (!fs.existsSync(projectDir)) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Build studio export command
    let cmd = `cd "${STUDIO_PATH}" && ./studio export "${projectId}" --target ${target} --mode ${mode}`;
    if (preset) {
      cmd += ` --preset "${preset}"`;
    }

    const { stdout, stderr } = await execAsync(cmd, { timeout: 120000 });

    // Parse output to find generated files
    const outputDir = path.join(projectDir, "output");
    let outputFiles: Array<{ name: string; path: string; size: number; modified: string }> = [];
    
    if (fs.existsSync(outputDir)) {
      outputFiles = fs.readdirSync(outputDir)
        .filter(f => f.endsWith(".fcpxml") || f.endsWith(".edl") || f.endsWith(".xml") || f.endsWith(".wav") || f.endsWith(".mov") || f.endsWith(".mp4"))
        .map(f => ({
          name: f,
          path: path.join(outputDir, f),
          size: fs.statSync(path.join(outputDir, f)).size,
          modified: fs.statSync(path.join(outputDir, f)).mtime.toISOString(),
        }))
        .sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());
    }

    return NextResponse.json({
      success: true,
      stdout,
      stderr,
      outputFiles,
      target,
      mode,
    });
  } catch (error: any) {
    console.error("Error exporting:", error);
    return NextResponse.json({ 
      error: error.message || "Failed to export",
      stdout: error.stdout,
      stderr: error.stderr,
    }, { status: 500 });
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
    const outputDir = path.join(projectDir, "output");

    if (!fs.existsSync(outputDir)) {
      return NextResponse.json({ files: [] });
    }

    const files = fs.readdirSync(outputDir)
      .filter(f => f.endsWith(".fcpxml") || f.endsWith(".edl") || f.endsWith(".xml") || f.endsWith(".wav") || f.endsWith(".mov") || f.endsWith(".mp4"))
      .map(f => {
        const filePath = path.join(outputDir, f);
        const stats = fs.statSync(filePath);
        return {
          name: f,
          path: filePath,
          size: stats.size,
          modified: stats.mtime.toISOString(),
        };
      })
      .sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());

    return NextResponse.json({ files });
  } catch (error) {
    console.error("Error listing exports:", error);
    return NextResponse.json({ error: "Failed to list exports" }, { status: 500 });
  }
}