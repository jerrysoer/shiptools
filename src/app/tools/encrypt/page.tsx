import { Metadata } from "next";
import FileEncryptor from "@/components/tools/FileEncryptor";

export const metadata: Metadata = {
  title: "File Encryption — ShipTools",
  description:
    "Encrypt and decrypt files with AES-256-GCM using a password. All processing happens locally in your browser.",
};

export default function EncryptPage() {
  return <FileEncryptor />;
}
