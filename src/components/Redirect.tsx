import { useNavigate } from "@solidjs/router";

// Replaces the removed <Navigate> component (Solid Router 2): navigating at
// setup time produces a real 302 via the request event during SSR, and an
// immediate client-side navigation after hydration.
export default function Redirect(props: { href: string }) {
  const navigate = useNavigate();
  navigate(props.href);
  return null;
}
