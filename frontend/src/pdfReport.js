import jsPDF from "jspdf";

// Brand palette (RGB)
const BLUE = [54, 163, 255];
const TEAL = [79, 210, 194];
const DARK = [13, 17, 24];
const SLATE = [90, 103, 117];
const LIGHT = [235, 240, 248];

// strip markdown to plain text for the body
function stripMd(md) {
  return (md || "")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`(.*?)`/g, "$1")
    .replace(/^\s*[-*]\s+/gm, "•  ")
    .trim();
}

// extract a named ## section from the AI report
function extractSection(report, heading) {
  if (!report) return "";
  const pattern = new RegExp(
    `##\\s*${heading}[^\n]*\n([\\s\\S]*?)(?=\n##|$)`,
    "i"
  );
  const match = report.match(pattern);
  if (!match) return "";
  return match[1]
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/^\s*[-*]\s+/gm, "•  ")
    .trim();
}

export function generatePDF(result) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 40; // margin
  let y = 0;

  // ---------- Header band ----------
  doc.setFillColor(...DARK);
  doc.rect(0, 0, W, 90, "F");

  // gradient-ish accent line (two rects)
  doc.setFillColor(...BLUE);
  doc.rect(0, 90, W * 0.6, 4, "F");
  doc.setFillColor(...TEAL);
  doc.rect(W * 0.6, 90, W * 0.4, 4, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("InfraBeat", M, 44);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...TEAL);
  doc.text("AI MARKET INTELLIGENCE", M, 60);

  doc.setTextColor(180, 190, 200);
  doc.setFontSize(9);
  const date = new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  doc.text(date, W - M, 44, { align: "right" });

  y = 130;

  // ---------- Title ----------
  doc.setTextColor(...DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(`Market Report: ${result.keyword}`, M, y);
  y += 22;

  // verdict pill
  const verdict = result.verdict || "";
  const isExcellent = verdict.includes("EXCELLENT");
  const isGood = verdict.includes("GOOD");
  const pillColor = isExcellent ? [52, 211, 153] : isGood ? [245, 181, 75] : [248, 113, 113];
  doc.setFillColor(...pillColor);
  doc.setFontSize(9);
  const pillW = doc.getTextWidth(verdict) + 20;
  doc.roundedRect(M, y - 2, pillW, 18, 9, 9, "F");
  doc.setTextColor(...DARK);
  doc.setFont("helvetica", "bold");
  doc.text(verdict, M + 10, y + 10);

  // trend note next to verdict pill
  if (result.trend && result.trend.available) {
    const t = result.trend;
    const arrow = t.direction === "rising" ? "^" : t.direction === "declining" ? "v" : "-";
    const trendTxt = `${arrow} ${t.direction} ${
      typeof t.change_pct === "number"
        ? `(${t.change_pct > 0 ? "+" : ""}${t.change_pct}% / 5y)`
        : ""
    }`;
    const tColor =
      t.direction === "rising" ? [34, 160, 110] : t.direction === "declining" ? [200, 60, 60] : SLATE;
    doc.setTextColor(...tColor);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(trendTxt, M + pillW + 14, y + 10);
  }
  y += 42;

  // ---------- Opportunity ring ----------
  const cx = W - M - 55;
  const cy = y + 20;
  const r = 38;
  const pct = Math.max(0, Math.min(100, result.opportunity_score || 0));

  // track
  doc.setDrawColor(...LIGHT);
  doc.setLineWidth(8);
  doc.circle(cx, cy, r, "S");

  // progress arc (approximate with line segments)
  doc.setDrawColor(...BLUE);
  doc.setLineWidth(8);
  const steps = Math.round((pct / 100) * 60);
  for (let i = 0; i < steps; i++) {
    const a1 = -Math.PI / 2 + (i / 60) * 2 * Math.PI;
    const a2 = -Math.PI / 2 + ((i + 1) / 60) * 2 * Math.PI;
    doc.line(
      cx + r * Math.cos(a1),
      cy + r * Math.sin(a1),
      cx + r * Math.cos(a2),
      cy + r * Math.sin(a2)
    );
  }
  doc.setTextColor(...DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(`${pct}`, cx, cy + 2, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...SLATE);
  doc.text("OPPORTUNITY", cx, cy + 14, { align: "center" });

  // ---------- Stat boxes ----------
  const stats = [
    { label: "GitHub Projects", value: (result.github_projects || 0).toLocaleString() },
    { label: "News Index", value: `${result.news_articles || 0}` },
    { label: "Market Demand", value: `${result.demand_score}/100` },
    { label: "Competition", value: `${result.competition_score}/100` },
  ];
  const boxW = (W - M * 2 - 30) / 2;
  const boxH = 46;
  stats.forEach((s, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const bx = M + col * (boxW + 30);
    const by = y + row * (boxH + 12);
    doc.setFillColor(247, 249, 252);
    doc.roundedRect(bx, by, boxW, boxH, 6, 6, "F");
    doc.setTextColor(...SLATE);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(s.label.toUpperCase(), bx + 12, by + 18);
    doc.setTextColor(...DARK);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(s.value, bx + 12, by + 38);
  });
  y += boxH * 2 + 12 + 30;

  // ---------- Products ----------
  if (result.products && result.products.length) {
    doc.setTextColor(...DARK);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("Top Rated Products", M, y);
    y += 18;
    doc.setFontSize(9);
    result.products.slice(0, 6).forEach((p) => {
      doc.setDrawColor(...LIGHT);
      doc.setLineWidth(0.5);
      doc.line(M, y - 4, W - M, y - 4);
      doc.setTextColor(...DARK);
      doc.setFont("helvetica", "normal");
      const title = doc.splitTextToSize(p.title || "Product", W - M * 2 - 120)[0];
      doc.text(title, M, y + 8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(20, 140, 130);
      doc.text(`${p.price || ""}`, W - M, y + 8, { align: "right" });
      y += 18;
    });
    y += 16;
  }

  // ---------- Summary Insight Cards (new sections) ----------
  const insightSections = [
    { emoji: "💰", label: "Market Value", key: "Market Value" },
    { emoji: "🎯", label: "Potential Customers", key: "Potential Customers" },
    { emoji: "🏆", label: "Best Makers", key: "Best Makers" },
    { emoji: "📈", label: "Key Investment Signals", key: "Key Investment Signals" },
  ].filter((s) => extractSection(result.ai_report, s.key));

  if (insightSections.length) {
    if (y > 620) { doc.addPage(); y = 50; }
    doc.setTextColor(...DARK);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("Market Intelligence Summary", M, y);
    y += 18;

    const cardW = (W - M * 2 - 20) / 2;
    const cardPad = 12;
    insightSections.forEach((s, i) => {
      const col = i % 2;
      const bx = M + col * (cardW + 20);
      const sectionText = extractSection(result.ai_report, s.key);
      const wrapped = doc.splitTextToSize(sectionText, cardW - cardPad * 2);
      const cardH = Math.min(wrapped.length * 11 + 38, 140);

      if (col === 0 && i > 0 && y + cardH > doc.internal.pageSize.getHeight() - 50) {
        doc.addPage(); y = 50;
      }

      // card background
      doc.setFillColor(247, 249, 252);
      doc.roundedRect(bx, y, cardW, cardH, 6, 6, "F");
      doc.setDrawColor(...BLUE);
      doc.setLineWidth(2);
      doc.roundedRect(bx, y, cardW, cardH, 6, 6, "S");

      // label
      doc.setTextColor(...BLUE);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text(`${s.emoji}  ${s.label.toUpperCase()}`, bx + cardPad, y + 14);

      // body text
      doc.setTextColor(50, 58, 68);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      const visibleLines = wrapped.slice(0, Math.floor((cardH - 28) / 11));
      visibleLines.forEach((line, li) => {
        doc.text(line, bx + cardPad, y + 26 + li * 11);
      });

      if (col === 1 || i === insightSections.length - 1) {
        y += cardH + 14;
      }
    });
    y += 10;
  }

  // ---------- AI report ----------
  if (y > 700) {
    doc.addPage();
    y = 50;
  }
  doc.setTextColor(...DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("AI Market Analysis", M, y);
  y += 18;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(50, 58, 68);
  const body = stripMd(result.ai_report);
  const lines = doc.splitTextToSize(body, W - M * 2);
  const lineH = 14;
  const pageH = doc.internal.pageSize.getHeight();

  lines.forEach((line) => {
    if (y > pageH - 50) {
      doc.addPage();
      y = 50;
    }
    doc.text(line, M, y);
    y += lineH;
  });

  // ---------- Footer on every page ----------
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(...LIGHT);
    doc.setLineWidth(0.5);
    doc.line(M, pageH - 32, W - M, pageH - 32);
    doc.setTextColor(...SLATE);
    doc.setFontSize(8);
    doc.text("Generated by InfraBeat · AI Market Intelligence", M, pageH - 18);
    doc.text(`Page ${i} of ${pageCount}`, W - M, pageH - 18, { align: "right" });
  }

  doc.save(`InfraBeat-${result.keyword}-report.pdf`);
}
