import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nura AI",
    short_name: "Nura",
    start_url: "/",
    icons: [
      {
        src: "/web-app-manifest-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/web-app-manifest-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    screenshots: [
      {
        src: "/screenshots/mobile.png",
        sizes: "390x844",
        type: "image/png",
        // form_factor tells Android this screenshot is for mobile — triggers
        // the richer "Add to Home Screen" sheet on Android Chrome
        form_factor: "narrow",
      },
    ],
    theme_color: "#2d362e",
    background_color: "#2d362e",
    display: "standalone",
  };
}
