import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useState } from "react";

const STORAGE_KEY = "tmt_ai_fab_y";

export function AiFab() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [y, setY] = useState(() => {
    try { return Number(localStorage.getItem(STORAGE_KEY)) || 300; } catch { return 300; }
  });

  // Hide on login, registro, suporte-ia, and home
  const hidden = !user || ["/login", "/registro", "/suporte-ia", "/"].includes(pathname);
  if (hidden) return null;

  return (
    <Link to="/suporte-ia" className="fixed right-4 z-50" style={{ top: y }}>
      <Button
        size="icon"
        className="h-14 w-14 rounded-full shadow-lg bg-gradient-to-br from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
        aria-label={t("components.aiFab.label")}
        draggable
        onDragEnd={(e) => {
          const newY = Math.max(80, Math.min(window.innerHeight - 80, e.clientY));
          setY(newY);
          try { localStorage.setItem(STORAGE_KEY, String(newY)); } catch { /* ignore */ }
        }}
      >
        <MessageSquare className="h-6 w-6" />
      </Button>
    </Link>
  );
}
