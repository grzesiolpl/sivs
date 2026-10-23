import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";

const execAsync = promisify(exec);

const STUDIO_PATH = process.env.STUDIO_PATH || "/Users/mac/AI-Video-Studio";

interface Project {
  id: string;
  name: string;
  template?: string;
  createdAt: string;
  updatedAt: string;
  settings: any;
  media: any[];
  tracks: any[];
  currentTime: number;
  duration: number;
  zoom: number;
  playbackRate: number;
  isPlaying: boolean;
  selectedClipIds: string[];
  editPlan?: any;
  qaReports: any[];
}

function getProjectDir(projectId: string): string {
  return path.join(STUDIO_PATH, "projects", projectId);
}

function getProjectFile(projectId: string): string {
  return path.join(getProjectDir(projectId), "project.json");
}

export async function GET() {
  try {
    const projectsDir = path.join(STUDIO_PATH, "projects");
    if (!fs.existsSync(projectsDir)) {
      return NextResponse.json({ projects: [] });
    }

    const projectDirs = fs.readdirSync(projectsDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    const projects: Project[] = [];

    for (const projectId of projectDirs) {
      const projectFile = getProjectFile(projectId);
      if (fs.existsSync(projectFile)) {
        const content = fs.readFileSync(projectFile, "utf-8");
        const project = JSON.parse(content);
        projects.push(project);
      }
    }

    return NextResponse.json({ projects });
  } catch (error) {
    console.error("Error listing projects:", error);
    return NextResponse.json({ error: "Failed to list projects" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, template = "anonymized_video" } = body;

    if (!name) {
      return NextResponse.json({ error: "Project name is required" }, { status: 400 });
    }

    const projectId = name.toLowerCase().replace(/[^a-z0-9]/g, "_");
    const projectDir = getProjectDir(projectId);

    if (fs.existsSync(projectDir)) {
      return NextResponse.json({ error: "Project already exists" }, { status: 409 });
    }

    fs.mkdirSync(path.join(projectDir, "input"), { recursive: true });
    fs.mkdirSync(path.join(projectDir, "previews"), { recursive: true });
    fs.mkdirSync(path.join(projectDir, "output"), { recursive: true });

    const templatePath = path.join(STUDIO_PATH, "templates", `${template}.json`);
    let editPlan: Record<string, any> = {};
    if (fs.existsSync(templatePath)) {
      editPlan = JSON.parse(fs.readFileSync(templatePath, "utf-8"));
      editPlan.project = projectId;
    }

    const project: Project = {
      id: projectId,
      name,
      template,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      settings: {
        resolution: { width: 1920, height: 1080 },
        framerate: 30,
        videoCodec: "libx264",
        audioCodec: "aac",
        crf: 20,
        preset: "medium",
        backgroundColor: "#000000",
        audioSampleRate: 48000,
        audioChannels: 2,
      },
      media: [],
      tracks: [],
      currentTime: 0,
      duration: 0,
      zoom: 1,
      playbackRate: 1,
      isPlaying: false,
      selectedClipIds: [],
      editPlan,
      qaReports: [],
    };

    fs.writeFileSync(getProjectFile(projectId), JSON.stringify(project, null, 2));

    const briefPath = path.join(projectDir, "brief.md");
    fs.writeFileSync(briefPath, `# Brief: ${name}\n\n## Surowce\n\n## Wymagania\n\n## Referencje\n`);

    return NextResponse.json({ project });
  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}