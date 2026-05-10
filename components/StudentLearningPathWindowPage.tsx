"use client";

import { useEffect, useState } from "react";
import { StudentLearningPathPage } from "@/components/StudentLearningPathPage";

export function StudentLearningPathWindowPage() {
  const [learningPath, setLearningPath] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadLearningPath() {
      try {
        const res = await fetch("/api/student/assignments");
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to load learning path.");
        if (active) setLearningPath(json.latestLearningPath || null);
      } catch {
        if (active) setError("Failed to load learning path.");
      } finally {
        if (active) setLoading(false);
      }
    }
    loadLearningPath();
    return () => {
      active = false;
    };
  }, []);

  function goBack() {
    if (window.opener) {
      window.close();
      return;
    }
    window.location.href = "/student";
  }

  if (loading) {
    return (
      <div className="rounded-3xl bg-white p-8 text-slate-700 shadow">
        Loading learning path...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl bg-white p-8 text-rose-700 shadow">
        {error}
      </div>
    );
  }

  return <StudentLearningPathPage learningPath={learningPath} onBack={goBack} />;
}
