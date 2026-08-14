import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense } from "solid-js";
import Footer from "~/components/Footer";
import Nav from "~/components/Nav";
import "./app.css";

export default function App() {
  return (
    <Router
      root={(props) => (
        <div class="flex min-h-screen flex-col">
          <Nav />
          <div class="flex-1">
            <Suspense>{props.children}</Suspense>
          </div>
          <Footer />
        </div>
      )}
    >
      <FileRoutes />
    </Router>
  );
}
