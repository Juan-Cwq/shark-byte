import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Cone of Uncertainty — Miami Dade College",
    short_name: "Cone",
    description: "MDC career pathways, study support, and storm alerts.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#003876",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
