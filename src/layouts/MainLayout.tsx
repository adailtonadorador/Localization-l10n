import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState } from "react";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <img src="/logo.png" alt="Sama Conect" className="w-10 h-10 object-contain" />
            <div className="hidden sm:block">
              <span className="text-xl font-bold text-emerald-700">Sama Conect</span>
              <span className="text-xs text-slate-500 block -mt-1">Conectando Oportunidades</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <a href="#como-funciona" className="text-sm font-medium text-slate-600 hover:text-emerald-600 transition-colors">
              Como Funciona
            </a>
            <a href="#para-trabalhadores" className="text-sm font-medium text-slate-600 hover:text-emerald-600 transition-colors">
              Para Trabalhadores
            </a>
            <a href="#para-empresas" className="text-sm font-medium text-slate-600 hover:text-emerald-600 transition-colors">
              Para Empresas
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link to="/login" className="hidden sm:block">
              <Button variant="ghost" size="sm" className="text-slate-600 hover:text-emerald-600">
                Entrar
              </Button>
            </Link>
            <Link to="/register" className="hidden sm:block">
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 shadow-sm">
                Cadastrar
              </Button>
            </Link>
            <button
              className="md:hidden p-2 hover:bg-slate-100 rounded-lg"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-white">
            <div className="container py-4 space-y-3">
              <a
                href="#como-funciona"
                className="block px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg"
                onClick={() => setMobileMenuOpen(false)}
              >
                Como Funciona
              </a>
              <a
                href="#para-trabalhadores"
                className="block px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg"
                onClick={() => setMobileMenuOpen(false)}
              >
                Para Trabalhadores
              </a>
              <a
                href="#para-empresas"
                className="block px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg"
                onClick={() => setMobileMenuOpen(false)}
              >
                Para Empresas
              </a>
              <div className="pt-3 border-t flex gap-3">
                <Link to="/login" className="flex-1">
                  <Button variant="outline" className="w-full">Entrar</Button>
                </Link>
                <Link to="/register" className="flex-1">
                  <Button className="w-full bg-emerald-600 hover:bg-emerald-700">Cadastrar</Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main content */}
      <main>{children}</main>

      {/* Footer */}
      <footer className="border-t bg-slate-900 text-slate-300">
        <div className="container py-12 md:py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <img src="/logo.png" alt="Sama Conect" className="w-9 h-9 object-contain bg-white rounded-lg p-1" />
                <span className="text-lg font-bold text-white">Sama Conect</span>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                Conectando trabalhadores e empresas para trabalhos temporários de forma rápida e segura.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-4">Plataforma</h3>
              <ul className="space-y-3 text-sm">
                <li><a href="#como-funciona" className="hover:text-emerald-400 transition-colors">Como Funciona</a></li>
                <li><a href="#para-empresas" className="hover:text-emerald-400 transition-colors">Para Empresas</a></li>
                <li><a href="#para-trabalhadores" className="hover:text-emerald-400 transition-colors">Para Trabalhadores</a></li>
                <li><a href="#" className="hover:text-emerald-400 transition-colors">Preços</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-4">Suporte</h3>
              <ul className="space-y-3 text-sm">
                <li><a href="#" className="hover:text-emerald-400 transition-colors">Central de Ajuda</a></li>
                <li><a href="#" className="hover:text-emerald-400 transition-colors">Contato</a></li>
                <li><a href="#" className="hover:text-emerald-400 transition-colors">FAQ</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-4">Legal</h3>
              <ul className="space-y-3 text-sm">
                <li><a href="#" className="hover:text-emerald-400 transition-colors">Termos de Uso</a></li>
                <li><a href="#" className="hover:text-emerald-400 transition-colors">Política de Privacidade</a></li>
                <li><a href="#" className="hover:text-emerald-400 transition-colors">Cookies</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-slate-500">
              © 2025 Sama Conect. Todos os direitos reservados.
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="text-slate-400 hover:text-emerald-400 transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
              </a>
              <a href="#" className="text-slate-400 hover:text-emerald-400 transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
              </a>
              <a href="#" className="text-slate-400 hover:text-emerald-400 transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
