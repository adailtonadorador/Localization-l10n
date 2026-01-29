import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-primary">SAMA</span>
            <span className="text-sm text-muted-foreground">Trabalhos Temporários</span>
          </div>

          <nav className="hidden md:flex items-center gap-6">
            <a href="#" className="text-sm font-medium hover:text-primary transition-colors">
              Como Funciona
            </a>
            <a href="#" className="text-sm font-medium hover:text-primary transition-colors">
              Para Empresas
            </a>
            <a href="#" className="text-sm font-medium hover:text-primary transition-colors">
              Para Trabalhadores
            </a>
          </nav>

          <div className="flex items-center gap-4">
            <Button variant="ghost">Entrar</Button>
            <Button>Cadastrar</Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main>{children}</main>

      {/* Footer */}
      <footer className="border-t bg-muted/50">
        <div className="container py-8 md:py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-semibold mb-4">SAMA</h3>
              <p className="text-sm text-muted-foreground">
                Conectando trabalhadores e empresas para trabalhos temporários.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Links</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">Sobre</a></li>
                <li><a href="#" className="hover:text-foreground">Contato</a></li>
                <li><a href="#" className="hover:text-foreground">FAQ</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">Termos de Uso</a></li>
                <li><a href="#" className="hover:text-foreground">Privacidade</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Contato</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>contato@sama.com.br</li>
                <li>(11) 99999-9999</li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
            © 2025 SAMA. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}
