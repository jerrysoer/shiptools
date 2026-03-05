import { Metadata } from "next";
import ExifStripper from "@/components/tools/ExifStripper";

export const metadata: Metadata = {
  title: "EXIF / Metadata Stripper — ShipTools",
  description:
    "View and strip EXIF metadata from images. Remove GPS coordinates, camera info, timestamps, and other embedded data — all processed locally in your browser.",
};

export default function ExifPage() {
  return <ExifStripper />;
}
