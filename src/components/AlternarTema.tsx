"use client";

import { Moon, Sun } from "lucide-react";

/**
 * Alterna entre claro e escuro. Sem escolha salva, segue o tema do aparelho
 * (o script em layout.tsx aplica a classe antes da pintura). O ícone vem do
 * CSS (`dark:`), então o botão não precisa de estado nem pisca ao carregar.
 */
export default function AlternarTema() {
  function alternar() {
    const escuro = document.documentElement.classList.toggle("dark");
    try {
      localStorage.setItem("tema", escuro ? "escuro" : "claro");
    } catch {
      // navegação privada: vale só até recarregar
    }
  }

  return (
    <button
      type="button"
      onClick={alternar}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
      aria-label="Alternar tema claro ou escuro"
      title="Tema claro/escuro"
    >
      <Moon className="h-5 w-5 dark:hidden" aria-hidden="true" />
      <Sun className="hidden h-5 w-5 dark:block" aria-hidden="true" />
    </button>
  );
}
