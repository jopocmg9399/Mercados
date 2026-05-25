import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/src/context/ThemeContext";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="rounded-xl w-10 h-10 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all duration-300 relative border border-transparent hover:border-slate-300 dark:hover:border-slate-700"
      title={theme === 'light' ? 'Activar Modo Oscuro' : 'Activar Modo Claro'}
    >
      {theme === 'light' ? (
        <Moon className="h-[1.2rem] w-[1.2rem] text-slate-700 animate-in zoom-in-50 duration-300" />
      ) : (
        <Sun className="h-[1.2rem] w-[1.2rem] text-amber-500 animate-in zoom-in-50 duration-300" />
      )}
      <span className="sr-only">Cambiar tema</span>
    </Button>
  );
}
