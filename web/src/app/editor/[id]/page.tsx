"use client";

import { Editor } from "@/components/editor/Editor";
import { useAppStore } from "@/store";
import { useEffect } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useRouter, usePathname } from "next/navigation";

export default function EditorPage() {
  const { currentProjectId, getCurrentProject, projects, setCurrentProject } = useAppStore();
  const router = useRouter();
  const pathname = usePathname();

  const project = getCurrentProject();

  useEffect(() => {
    if (!currentProjectId && projects.length > 0) {
      router.push("/");
    }
  }, [currentProjectId, projects.length, router]);

  if (!project) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-lg">Ładowanie projektu...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full flex-col">
      <div className="border-b bg-background/95 backdrop-blur sticky top-0 z-30">
        <div className="container mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => { setCurrentProject(null); router.push("/"); }} aria-label="Powrót do projektów">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="font-bold">{project.name}</h1>
              <p className="text-sm text-muted-foreground">
                Szablon: {project.template?.replace("_", " ")} • Utworzono: {new Date(project.createdAt).toLocaleDateString("pl-PL")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-1" />
              Eksport
            </Button>
            <Button variant="ghost" size="icon" aria-label="Ustawienia projektu">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <Editor />
    </div>
  );
}

import { Download, Settings } from "lucide-react";