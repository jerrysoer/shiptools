import { Metadata } from "next";
import PasswordGenerator from "@/components/tools/PasswordGenerator";

export const metadata: Metadata = {
  title: "Password Generator — ShipTools",
  description:
    "Generate strong passwords and passphrases with a strength meter. Cryptographically secure, runs entirely in your browser.",
};

export default function PasswordPage() {
  return <PasswordGenerator />;
}
