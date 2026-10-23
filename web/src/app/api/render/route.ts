import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";

const execAsync = promisify(exec);

const STUDIO_PATH = process.env.STUDIO_PATH || "/Users/mac/AI-Video-Studio";

interface RenderRequest {
  projectId: string;
  stage: "preview" | "final";
  editPlan?: any;
}

export async function POST(request: NextRequest) {
  try {
    const body: RenderRequest = await request.json();
    const { projectId, stage = "preview", editPlan } = body;

    if (!projectId) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
    }

    const projectDir = path.join(STUDIO_PATH, "projects", projectId);

    if (!fs.existsSync(projectDir)) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (editPlan) {
      const planPath = path.join(projectDir, "edit_plan.json");
      fs.writeFileSync(planPath, JSON.stringify(editPlan, null, 2));
    }

    const previewDir = path.join(projectDir, "previews");
    const outputDir = path.join(projectDir, "output");

    if (!fs.existsSync(previewDir)) fs.mkdirSync(previewDir, { recursive: true });
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const jobId = `render_${Date.now()}`;
    const isPreview = stage === "preview";

    const crf = isPreview ? 28 : 20;
    const preset = isPreview ? "ultrafast" : "medium";
    const outputFile = isPreview ? "preview_draft.mp4" : "final.mp4";
    const outputPath = isPreview ? path.join(previewDir, outputFile) : path.join(outputDir, outputFile);

    const planPath = path.join(projectDir, "edit_plan.json");
    if (!fs.existsSync(planPath)) {
      return NextResponse.json({ error: "Edit plan not found. Generate or create a plan first." }, { status: 400 });
    }

    const plan = JSON.parse(fs.readFileSync(planPath, "utf-8"));

    const operations = plan.operations || [];
    if (operations.length === 0) {
      return NextResponse.json({ error: "No operations in edit plan" }, { status: 400 });
    }

    const tempDir = path.join(projectDir, `.temp_${jobId}`);
    fs.mkdirSync(tempDir, { recursive: true });

    try {
      let currentInput = "";
      let segmentIndex = 0;

      for (const op of operations) {
        const inputFile = path.join(projectDir, "input", op.file);
        if (!fs.existsSync(inputFile)) {
          throw new Error(`Input file not found: ${op.file}`);
        }

        const outputSegment = path.join(tempDir, `segment_${segmentIndex}.mp4`);
        segmentIndex++;

        if (op.action === "keep_range" || op.action === "slow_motion") {
          const start = op.start;
          const end = op.end;
          const duration = end - start;

          let cmd = `ffmpeg -y -i "${inputFile}" -ss ${start} -t ${duration} -c:v libx264 -crf ${crf} -preset ${preset} -c:a aac -b:a 128k`;

          if (op.action === "slow_motion" && op.speed) {
            const pts = 1 / op.speed;
            cmd += ` -filter:v "setpts=${pts}*PTS" -filter:a "atempo=${op.speed}"`;
          }

          cmd += ` "${outputSegment}"`;

          await execAsync(cmd);
          currentInput = outputSegment;
        } else if (op.action === "remove_range") {
          const start = op.start;
          const end = op.end;

          const beforeSegment = path.join(tempDir, `segment_${segmentIndex}_before.mp4`);
          segmentIndex++;
          const afterSegment = path.join(tempDir, `segment_${segmentIndex}_after.mp4`);
          segmentIndex++;

          await execAsync(`ffmpeg -y -i "${inputFile}" -t ${start} -c:v libx264 -crf ${crf} -preset ${preset} -c:a aac -b:a 128k "${beforeSegment}"`);

          const { stdout: durationOut } = await execAsync(`ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${inputFile}"`);
          const totalDuration = parseFloat(durationOut.trim());

          if (end < totalDuration) {
            const afterDuration = totalDuration - end;
            await execAsync(`ffmpeg -y -i "${inputFile}" -ss ${end} -t ${afterDuration} -c:v libx264 -crf ${crf} -preset ${preset} -c:a aac -b:a 128k "${afterSegment}"`);

            const concatFile = path.join(tempDir, `concat_${segmentIndex}.txt`);
            segmentIndex++;
            fs.writeFileSync(concatFile, `file '${beforeSegment}'\nfile '${afterSegment}'`);
            await execAsync(`ffmpeg -y -f concat -safe 0 -i "${concatFile}" -c copy "${outputSegment}"`);
            currentInput = outputSegment;
          } else {
            currentInput = beforeSegment;
          }
        }
      }

      if (currentInput && fs.existsSync(currentInput)) {
        await execAsync(`ffmpeg -y -i "${currentInput}" -c:v libx264 -crf ${crf} -preset ${preset} -c:a aac -b:a 128k "${outputPath}"`);
      }

      const { stdout: finalDuration } = await execAsync(`ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${outputPath}"`);

      fs.rmSync(tempDir, { recursive: true, force: true });

      return NextResponse.json({
        success: true,
        outputPath,
        duration: parseFloat(finalDuration.trim()),
        stage,
      });
    } catch (renderError) {
      fs.rmSync(tempDir, { recursive: true, force: true });
      throw renderError;
    }
  } catch (error: any) {
    console.error("Error rendering:", error);
    return NextResponse.json({ error: error.message || "Failed to render" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get("projectId");
    const stage = searchParams.get("stage") as "preview" | "final";

    if (!projectId) {
      return NextResponse.json({ error: "Project ID required" }, { status: 400 });
    }

    const projectDir = path.join(STUDIO_PATH, "projects", projectId);
    const targetDir = stage === "preview"
      ? path.join(projectDir, "previews")
      : path.join(projectDir, "output");

    if (!fs.existsSync(targetDir)) {
      return NextResponse.json({ files: [] });
    }

    const files = fs.readdirSync(targetDir).map(file => {
      const filePath = path.join(targetDir, file);
      const stats = fs.statSync(filePath);
      return {
        name: file,
        path: filePath,
        size: stats.size,
        modified: stats.mtime.toISOString(),
      };
    });

    return NextResponse.json({ files });
  } catch (error) {
    console.error("Error listing renders:", error);
    return NextResponse.json({ error: "Failed to list renders" }, { status: 500 });
  }
}