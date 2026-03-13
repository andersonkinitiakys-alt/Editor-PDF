import { Outlet, Link } from "react-router-dom";
import { FileText, Menu, X } from "lucide-react";
import { useState } from "react";

export function Layout() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <Link to="/" className="flex-shrink-0 flex items-center gap-2">
                <FileText className="h-8 w-8 text-emerald-600" />
                <span className="font-bold text-xl text-gray-900">PDF Studio</span>
              </Link>
              <nav className="hidden md:ml-6 md:flex md:space-x-8">
                <Link to="/merge" className="border-transparent text-gray-500 hover:border-emerald-500 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  Juntar PDF
                </Link>
                <Link to="/split" className="border-transparent text-gray-500 hover:border-emerald-500 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  Dividir PDF
                </Link>
                <Link to="/rotate" className="border-transparent text-gray-500 hover:border-emerald-500 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  Rodar PDF
                </Link>
                <Link to="/watermark" className="border-transparent text-gray-500 hover:border-emerald-500 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  Marca d'água
                </Link>
              </nav>
            </div>
            <div className="flex items-center md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-500"
              >
                {isMenuOpen ? <X className="block h-6 w-6" /> : <Menu className="block h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {isMenuOpen && (
          <div className="md:hidden">
            <div className="pt-2 pb-3 space-y-1">
              <Link to="/merge" className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-50 hover:border-emerald-500">
                Juntar PDF
              </Link>
              <Link to="/split" className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-50 hover:border-emerald-500">
                Dividir PDF
              </Link>
              <Link to="/rotate" className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-50 hover:border-emerald-500">
                Rodar PDF
              </Link>
              <Link to="/watermark" className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-50 hover:border-emerald-500">
                Marca d'água
              </Link>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>

      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()} PDF Studio. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
