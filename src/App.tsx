import { Loading } from "solid-js";
import Footer from "~/components/Footer";
import Nav from "~/components/Nav";
import { Router } from "~/router";
import "./app.css";

// The app root (the old app.tsx): the router instance plus the site-wide
// layout live here; no document tags. <Suspense> became Solid 2's <Loading>.
export default function App() {
  return (
    <Router>
      {(props) => (
        <div class="flex min-h-screen flex-col">
          <Nav />
          <div class="flex-1">
            <Loading>{props.children}</Loading>
          </div>
          <Footer />
        </div>
      )}
    </Router>
  );
}
