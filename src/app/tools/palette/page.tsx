import { Metadata } from "next";
import ColorPalette from "@/components/tools/ColorPalette";

export const metadata: Metadata = {
  title: "Color Palette from Image — ShipLocal",
  description:
    "Extract dominant colors from any image using k-means clustering. Copy hex and RGB values.",
};

export default function PalettePage() {
  return <ColorPalette />;
}
