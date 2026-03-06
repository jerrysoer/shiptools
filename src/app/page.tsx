import {
  Hash,
  QrCode,
  KeyRound,
  ArrowRight,
  Image,
  FileText,
  Music,
  Video,
  FileSignature,
  ShieldCheck,
  EyeOff,
  Lock,
  Sparkles,
  Cpu,
  Mic,
  Monitor,
  Camera,
  FileImage,
} from "lucide-react";
import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "ShipLocal — Local-first productivity suite",
  description:
    "Developer & privacy tools that run entirely in your browser. Hash, encrypt, convert, sign — no uploads, no tracking.",
};

export default function HomePage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        {/* AI Tools — hero position */}
        <section className="px-6 pt-16 pb-16">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-accent/10 mb-5">
                <Sparkles className="w-7 h-7 text-accent" />
              </div>
              <h1 className="font-heading font-bold text-4xl sm:text-5xl mb-4 leading-tight">
                Run AI locally — no server, no API keys
              </h1>
              <p className="text-text-secondary text-lg mb-10 max-w-2xl mx-auto">
                Summarize, rewrite, and explain — powered by an AI model
                running entirely in your browser.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 mb-6">
              <a
                href="/ai/summarize"
                className="group bg-bg-surface border border-border rounded-xl p-6 hover:border-border-hover transition-colors"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-accent/10">
                    <Sparkles className="w-5 h-5 text-accent" />
                  </div>
                  <h3 className="font-heading font-semibold">Text Summarizer</h3>
                </div>
                <p className="text-text-tertiary text-sm">
                  Paste long text and get a concise summary — powered by local AI
                </p>
              </a>

              <a
                href="/ai/rewrite"
                className="group bg-bg-surface border border-border rounded-xl p-6 hover:border-border-hover transition-colors"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-accent/10">
                    <Cpu className="w-5 h-5 text-accent" />
                  </div>
                  <h3 className="font-heading font-semibold">Text Rewriter</h3>
                </div>
                <p className="text-text-tertiary text-sm">
                  Rewrite text in different tones — formal, simple, shorter, or detailed
                </p>
              </a>
            </div>

            <div className="text-center">
              <a
                href="/ai"
                className="inline-flex items-center gap-2 text-accent hover:text-accent/80 font-medium text-sm transition-colors"
              >
                See all AI tools
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </section>

        {/* Converters */}
        <section className="px-6 pb-16">
          <div className="max-w-4xl mx-auto">
            <div className="border-t border-border pt-12">
              <div className="text-center mb-8">
                <h2 className="font-heading font-semibold text-2xl mb-2">
                  Convert files without uploading them
                </h2>
                <p className="text-text-secondary">
                  Images, documents, audio, and video — all processed locally in
                  your browser.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <a
                  href="/convert/images"
                  className="group bg-bg-surface border border-border rounded-xl p-6 hover:border-border-hover transition-colors"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-accent/10">
                      <Image className="w-5 h-5 text-accent" />
                    </div>
                    <h3 className="font-heading font-semibold">Images</h3>
                  </div>
                  <p className="text-text-tertiary text-sm">
                    PNG, JPG, WebP, AVIF — resize, compress, convert
                  </p>
                </a>

                <a
                  href="/convert/documents"
                  className="group bg-bg-surface border border-border rounded-xl p-6 hover:border-border-hover transition-colors"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-accent/10">
                      <FileText className="w-5 h-5 text-accent" />
                    </div>
                    <h3 className="font-heading font-semibold">Documents</h3>
                  </div>
                  <p className="text-text-tertiary text-sm">
                    PDF, DOCX, CSV, TXT — convert between formats
                  </p>
                </a>

                <a
                  href="/convert/audio"
                  className="group bg-bg-surface border border-border rounded-xl p-6 hover:border-border-hover transition-colors"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-accent/10">
                      <Music className="w-5 h-5 text-accent" />
                    </div>
                    <h3 className="font-heading font-semibold">Audio</h3>
                  </div>
                  <p className="text-text-tertiary text-sm">
                    MP3, WAV, OGG, AAC — transcode, trim, adjust bitrate
                  </p>
                </a>

                <a
                  href="/convert/video"
                  className="group bg-bg-surface border border-border rounded-xl p-6 hover:border-border-hover transition-colors"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-accent/10">
                      <Video className="w-5 h-5 text-accent" />
                    </div>
                    <h3 className="font-heading font-semibold">Video</h3>
                  </div>
                  <p className="text-text-tertiary text-sm">
                    MP4, WebM, GIF — resize, trim, adjust quality
                  </p>
                </a>
              </div>

              <div className="text-center">
                <a
                  href="/convert"
                  className="inline-flex items-center gap-2 text-accent hover:text-accent/80 font-medium text-sm transition-colors"
                >
                  See all converters
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Record & Capture */}
        <section className="px-6 pb-16">
          <div className="max-w-4xl mx-auto">
            <div className="border-t border-border pt-12">
              <div className="text-center mb-8">
                <h2 className="font-heading font-semibold text-2xl mb-2">
                  Record, capture, and transcribe
                </h2>
                <p className="text-text-secondary">
                  Voice memos, screen recordings, meeting notes, and document
                  scanning — all processed locally with optional AI transcription.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <a
                  href="/record/voice"
                  className="group bg-bg-surface border border-border rounded-xl p-6 hover:border-border-hover transition-colors"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-accent/10">
                      <Mic className="w-5 h-5 text-accent" />
                    </div>
                    <h3 className="font-heading font-semibold">Voice Memo</h3>
                  </div>
                  <p className="text-text-tertiary text-sm">
                    Record, bookmark, trim, and export audio
                  </p>
                </a>

                <a
                  href="/record/screen"
                  className="group bg-bg-surface border border-border rounded-xl p-6 hover:border-border-hover transition-colors"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-accent/10">
                      <Monitor className="w-5 h-5 text-accent" />
                    </div>
                    <h3 className="font-heading font-semibold">Screen Recorder</h3>
                  </div>
                  <p className="text-text-tertiary text-sm">
                    Capture screen with webcam overlay and audio
                  </p>
                </a>

                <a
                  href="/scan"
                  className="group bg-bg-surface border border-border rounded-xl p-6 hover:border-border-hover transition-colors"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-accent/10">
                      <Camera className="w-5 h-5 text-accent" />
                    </div>
                    <h3 className="font-heading font-semibold">Doc Scanner</h3>
                  </div>
                  <p className="text-text-tertiary text-sm">
                    Scan documents to PDF with edge detection and OCR
                  </p>
                </a>

                <a
                  href="/record/meeting"
                  className="group bg-bg-surface border border-border rounded-xl p-6 hover:border-border-hover transition-colors"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-accent/10">
                      <FileImage className="w-5 h-5 text-accent" />
                    </div>
                    <h3 className="font-heading font-semibold">Meeting Notes</h3>
                  </div>
                  <p className="text-text-tertiary text-sm">
                    Record, transcribe, and summarize meetings with AI
                  </p>
                </a>
              </div>

              <div className="text-center">
                <a
                  href="/record"
                  className="inline-flex items-center gap-2 text-accent hover:text-accent/80 font-medium text-sm transition-colors"
                >
                  See all recording tools
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Sign CTA */}
        <section className="px-6 pb-16">
          <div className="max-w-4xl mx-auto">
            <div className="border-t border-border pt-12">
              <a
                href="/sign"
                className="group block bg-bg-surface border border-border rounded-xl p-8 hover:border-border-hover transition-colors"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                  <div className="p-3 rounded-xl bg-accent/10 group-hover:bg-accent/15 transition-colors">
                    <FileSignature className="w-7 h-7 text-accent" />
                  </div>
                  <div>
                    <h2 className="font-heading font-semibold text-xl mb-1">
                      Sign PDFs without uploading them
                    </h2>
                    <p className="text-text-secondary text-sm">
                      Add signatures, fill form fields, and insert dates — all
                      processed in your browser. No server, no account required.
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-text-tertiary group-hover:text-accent transition-colors sm:ml-auto shrink-0" />
                </div>
              </a>
            </div>
          </div>
        </section>

        {/* Developer & Privacy Tools */}
        <section className="px-6 pb-16">
          <div className="max-w-4xl mx-auto">
            <div className="border-t border-border pt-12">
              <div className="text-center mb-8">
                <h2 className="font-heading font-semibold text-2xl mb-2">
                  Local & Private
                </h2>
                <p className="text-text-secondary">
                  Hash, encrypt, generate, decode, and inspect — 20 tools that run
                  entirely in your browser. No data ever leaves your device.
                </p>
              </div>

              <div className="grid sm:grid-cols-3 gap-4 mb-8">
                <a
                  href="/tools/hash"
                  className="group bg-bg-surface border border-border rounded-xl p-6 hover:border-border-hover transition-colors text-left"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-accent/10">
                      <Hash className="w-5 h-5 text-accent" />
                    </div>
                    <h3 className="font-heading font-semibold">Hash Calculator</h3>
                  </div>
                  <p className="text-text-tertiary text-sm">
                    MD5, SHA-1, SHA-256, SHA-512 for text and files
                  </p>
                </a>

                <a
                  href="/tools/qr"
                  className="group bg-bg-surface border border-border rounded-xl p-6 hover:border-border-hover transition-colors text-left"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-accent/10">
                      <QrCode className="w-5 h-5 text-accent" />
                    </div>
                    <h3 className="font-heading font-semibold">QR Code Generator</h3>
                  </div>
                  <p className="text-text-tertiary text-sm">
                    URLs, WiFi, vCards, and text — download as PNG or SVG
                  </p>
                </a>

                <a
                  href="/tools/password"
                  className="group bg-bg-surface border border-border rounded-xl p-6 hover:border-border-hover transition-colors text-left"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-accent/10">
                      <KeyRound className="w-5 h-5 text-accent" />
                    </div>
                    <h3 className="font-heading font-semibold">Password Generator</h3>
                  </div>
                  <p className="text-text-tertiary text-sm">
                    Strong passwords and passphrases with strength meter
                  </p>
                </a>
              </div>

              <div className="text-center">
                <a
                  href="/tools"
                  className="inline-flex items-center gap-2 text-accent hover:text-accent/80 font-medium text-sm transition-colors"
                >
                  See all 20 tools
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Privacy Promise */}
        <section className="px-6 pb-20">
          <div className="max-w-4xl mx-auto">
            <div className="border-t border-border pt-12">
              <div className="grid sm:grid-cols-3 gap-8 text-center">
                <div>
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-grade-a/10 mb-3">
                    <ShieldCheck className="w-5 h-5 text-grade-a" />
                  </div>
                  <h3 className="font-heading font-semibold mb-1">No Uploads</h3>
                  <p className="text-text-tertiary text-sm">
                    Your files never leave your device. All processing runs
                    locally in WebAssembly.
                  </p>
                </div>

                <div>
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-grade-a/10 mb-3">
                    <EyeOff className="w-5 h-5 text-grade-a" />
                  </div>
                  <h3 className="font-heading font-semibold mb-1">No Tracking</h3>
                  <p className="text-text-tertiary text-sm">
                    No third-party scripts, no ad networks, no fingerprinting.
                    Privacy-respecting analytics only.
                  </p>
                </div>

                <div>
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-grade-a/10 mb-3">
                    <Lock className="w-5 h-5 text-grade-a" />
                  </div>
                  <h3 className="font-heading font-semibold mb-1">No Accounts</h3>
                  <p className="text-text-tertiary text-sm">
                    No sign-ups, no logins, no personal data collected. Just open
                    and use.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
