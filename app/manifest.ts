import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "JOVI — Registro de Vendas",
    short_name: "JOVI",
    description: "Registro de vendas, estoque e ponto para promotores",
    start_url: "/",
    display: "standalone",
    background_color: "#F4F6FC",
    theme_color: "#1E46E6",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
