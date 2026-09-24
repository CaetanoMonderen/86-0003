import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mosselweekend Kassa 2026",
    short_name: "Mossel Kassa",
    description: "Kassasysteem voor Mosselweekend 2026 — werkt online en offline.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0f0f10",
    theme_color: "#b91c1c",
    icons: [
      {
        src: "/icon-512.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  }
}
