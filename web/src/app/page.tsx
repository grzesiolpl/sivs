"use client";

import { Editor } from "@/components/editor/Editor";
import { useAppStore } from "@/store";
import { useEffect } from "react";
import { FolderOpen, Plus, Settings, ChevronRight, Video, Zap, Sparkles, Layout, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useState } from "react";
import { formatDate, generateId } from "@/lib/utils";

export default function HomePage() {
  const { projects, setCurrentProject, addProject, deleteProject, settings, updateSettings } = useAppStore();
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectTemplate, setNewProjectTemplate] = useState("anonymized_video");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const templates = [
    { id: "anonymized_video", name: "Wideo z anonimizacją", description: "Dla materiałów medycznych - face blur, cięcia, slow-mo" },
    { id: "social_video", name: "Social Media (9:16)", description: "TikTok, Reels, Shorts - pionowy format" },
    { id: "documentary", name: "Dokumentalne", description: "Klatka 24fps, kinematograficzny wygląd" },
    { id: "blank", name: "Pusty projekt", description: "Zacznij od zera" },
  ];

  const handleCreateProject = () => {
    if (!newProjectName.trim()) return;
    const project = {
      id: generateId(),
      name: newProjectName,
      template: newProjectTemplate,
      createdAt: new Date(),
      updatedAt: new Date(),
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
      qaReports: [],
    };
    addProject(project);
    setCurrentProject(project.id);
    setShowNewProject(false);
    setNewProjectName("");
  };

  if (projects.length === 0 && !showNewProject) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gradient-to-br from-blue-50 to-white">
        <div className="text-center max-w-md px-8">
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-primary/10 text-primary mb-6">
              <Video className="h-12 w-12" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight">SIVS</h1>
            <p className="text-xl text-muted-foreground mt-2">Super Intelligence Video Studio</p>
          </div>
          <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
            Lokalne studio postprodukcji wideo z AI. Importuj media, twórz timeliny, renderuj z Kinocut/FFmpeg.
          </p>
          <div className="flex flex-col gap-3">
            <Button size="lg" onClick={() => setShowNewProject(true)} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Utwórz pierwszy projekt
            </Button>
            <Button variant="outline" size="lg" onClick={() => updateSettings({ studioPath: settings.studioPath })} className="w-full">
              <Settings className="h-4 w-4 mr-2" />
              Ustawienia ścieżek
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full flex-col">
      {projects.length > 0 && (
        <div className="border-b bg-background/95 backdrop-blur sticky top-14 z-30">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <h1 className="text-xl font-bold">SIVS - Super Intelligence Video Studio</h1>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => setShowNewProject(true)} aria-label="Nowy projekt">
                <Plus className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" aria-label="Ustawienia">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {projects.length > 0 && (
        <div className="container mx-auto px-4 py-6 flex-1 overflow-auto">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold">Twoje projekty</h2>
            <Button onClick={() => setShowNewProject(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nowy projekt
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onOpen={() => setCurrentProject(project.id)}
                onDelete={() => setDeleteConfirm(project.id)}
              />
            ))}
          </div>
        </div>
      )}

      <Dialog open={showNewProject} onOpenChange={setShowNewProject}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nowy projekt</DialogTitle>
            <DialogDescription>
              Wybierz nazwę i szablon dla nowego projektu wideo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="project-name">Nazwa projektu</Label>
              <Input
                id="project-name"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="np. giewont_2026"
                autoFocus
              />
            </div>
            <div>
              <Label>Szablon</Label>
              <div className="space-y-2 mt-2">
                {templates.map((template) => (
                  <label
                    key={template.id}
                    className={`
                      flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all
                      ${newProjectTemplate === template.id
                        ? "border-primary bg-primary/5"
                        : "border-muted-foreground/20 hover:border-primary/50"
                      }
                    `}
                  >
                    <input
                      type="radio"
                      name="template"
                      value={template.id}
                      checked={newProjectTemplate === template.id}
                      onChange={() => setNewProjectTemplate(template.id)}
                      className="sr-only"
                    />
                    <div className="flex-1">
                      <p className="font-medium">{template.name}</p>
                      <p className="text-sm text-muted-foreground">{template.description}</p>
                    </div>
                    <Sparkles className="h-5 w-5 text-primary" />
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewProject(false)}>Anuluj</Button>
            <Button onClick={handleCreateProject} disabled={!newProjectName.trim()}>
              Utwórz projekt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {deleteConfirm && (
        <Dialog open={true} onOpenChange={() => setDeleteConfirm(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Usuń projekt?</DialogTitle>
              <DialogDescription>
                Ta operacji nie można cofnąć. Pliki w folderze projektu pozostaną nienaruszone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Anuluj</Button>
              <Button variant="destructive" onClick={() => { deleteProject(deleteConfirm); setDeleteConfirm(null); }}>
                Usuń
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function ProjectCard({ project, onOpen, onDelete }: { project: any; onOpen: () => void; onDelete: () => void }) {
  const mediaCount = project.media?.length || 0;
  const trackCount = project.tracks?.length || 0;

  return (
    <Card className="h-full transition-all hover:shadow-lg cursor-pointer" onClick={onOpen}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{project.name}</CardTitle>
            <CardDescription className="mt-1">
              {project.template?.replace("_", " ")} • {formatDate(project.createdAt)}
            </CardDescription>
          </div>
          <Button variant="ghost" size="iconSm" onClick={(e) => { e.stopPropagation(); onDelete(); }} aria-label="Usuń projekt">
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Video className="h-3.5 w-3.5" />
            {mediaCount} mediów
          </span>
          <span className="flex items-center gap-1">
            <Layout className="h-3.5 w-3.5" />
            {trackCount} ścieżek
          </span>
        </div>
        <div className="mt-4 pt-4 border-t flex justify-end">
          <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); onOpen(); }}>
            <ChevronRight className="h-3.5 w-3.5 mr-1" />
            Otwórz
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}