import type { Message } from "./api";

/** Plain-text version of a conversation, with its citations, for copying and sharing. */
export function chatTranscript(title: string, messages: Message[]): string {
  const body = messages
    .filter((m) => m.content.trim())
    .map((m) => {
      if (m.role === "user") return `Q: ${m.content.trim()}`;
      const cites = m.sources.map((s) => `  [${s.n}] ${s.filename}, page ${s.page}`).join("\n");
      return `A: ${m.content.trim()}${cites ? `\n\nSources\n${cites}` : ""}`;
    })
    .join("\n\n---\n\n");
  return `${title}\n${"=".repeat(Math.min(title.length, 60))}\n\n${body}\n\nExported from DocSage`;
}

// The built-in PDF fonts cover Latin text only, so swap common typographic characters for plain ones.
const plain = (s: string) =>
  s
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/[•●]/g, "-")
    .replace(/ /g, " ")
    .replace(/[^\x09\x0A\x20-\x7E¡-ÿ]/g, "");

// Answers are Markdown; the PDF shows the readable text without the markup.
const unmarkdown = (s: string) =>
  s
    .replace(/```[\s\S]*?```/g, (m) => m.replace(/```\w*\n?/g, ""))
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, "$1 ($2)")
    .replace(/^\s*[-*]\s+/gm, "- ");

/** Builds a PDF of the whole conversation and downloads it. jsPDF is loaded on demand. */
export async function downloadChatPdf(title: string, messages: Message[]): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 52;
  const maxW = W - M * 2;
  let y = M;

  const room = (need: number) => {
    if (y + need > H - M) {
      doc.addPage();
      y = M;
    }
  };
  const write = (text: string, size: number, color: [number, number, number], style: "normal" | "bold" = "normal", gap = 4) => {
    doc.setFont("helvetica", style).setFontSize(size).setTextColor(...color);
    for (const line of doc.splitTextToSize(plain(text), maxW) as string[]) {
      room(size * 1.4);
      doc.text(line, M, y);
      y += size * 1.4;
    }
    y += gap;
  };

  // header band
  doc.setFillColor(47, 100, 240).rect(0, 0, W, 6, "F");
  write(title || "DocSage chat", 20, [12, 19, 48], "bold", 2);
  write(`Exported ${new Date().toLocaleString()}`, 9, [91, 103, 133], "normal", 14);

  for (const m of messages.filter((x) => x.content.trim())) {
    if (m.role === "user") {
      room(40);
      write("QUESTION", 8, [124, 77, 255], "bold", 2);
      write(m.content, 11.5, [12, 19, 48], "bold", 10);
    } else {
      write("ANSWER", 8, [47, 100, 240], "bold", 2);
      write(unmarkdown(m.content), 11, [30, 38, 70], "normal", 6);
      if (m.sources.length) {
        write("Sources", 8.5, [91, 103, 133], "bold", 1);
        for (const s of m.sources) write(`[${s.n}] ${s.filename}, page ${s.page}`, 9, [91, 103, 133], "normal", 0);
      }
      y += 8;
      doc.setDrawColor(227, 232, 246).line(M, y, W - M, y);
      y += 16;
    }
  }

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i).setFont("helvetica", "normal").setFontSize(8).setTextColor(140, 150, 175);
    doc.text(`DocSage  -  page ${i} of ${pages}`, W / 2, H - 24, { align: "center" });
  }

  const name = plain(title || "docsage-chat").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "docsage-chat";
  doc.save(`${name}.pdf`);
}
