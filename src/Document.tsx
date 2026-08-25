import type { ParentProps } from "solid-js";
import { HydrationScript } from "@solidjs/web";

// The document shell (the old entry-server `document` callback): picked up
// by the src/Document.* convention, it wraps the app in the plugin's
// generated entries and must render the full <html>. Head tags go here.
export default function Document(props: ParentProps) {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <HydrationScript />
      </head>
      <body>{props.children}</body>
    </html>
  );
}
