import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Solucoes from "./pages/Solucoes";
import Duvidas from "./pages/Duvidas";
import Utilitarios from "./pages/Utilitarios";
import Contato from "./pages/Contato";

/**
 * App Component - BigCorps
 * Design: Modernismo Corporativo com Gradientes Dinâmicos
 * - Routing com Wouter
 * - Layout com Header e Footer
 * - Tema claro
 */

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/solucoes"} component={Solucoes} />
      <Route path={"/duvidas"} component={Duvidas} />
      <Route path={"/utilitarios"} component={Utilitarios} />
      <Route path={"/contato"} component={Contato} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <div className="flex flex-col min-h-screen">
            <Header />
            <main className="flex-1">
              <Router />
            </main>
            <Footer />
          </div>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
