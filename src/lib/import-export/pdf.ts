import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { TestPlan } from "@/types/domain";

const UNSUPPORTED_COLOR_FN_PATTERN = /(?:oklch|oklab|lab|lch)\([^)]+\)/gi;
const COLOR_STYLE_PROPERTIES = [
  "color",
  "background-color",
  "border-top-color",
  "border-right-color",
  "border-bottom-color",
  "border-left-color",
  "outline-color",
  "text-decoration-color",
  "box-shadow",
  "text-shadow",
  "caret-color",
  "column-rule-color",
  "fill",
  "stroke",
];

function resolveColorToRgb(colorValue: string, cache: Map<string, string>): string {
  const cached = cache.get(colorValue);
  if (cached) {
    return cached;
  }

  const probe = document.createElement("span");
  probe.style.color = colorValue;
  document.body.appendChild(probe);
  const resolved = getComputedStyle(probe).color || colorValue;
  probe.remove();

  cache.set(colorValue, resolved);
  return resolved;
}

function sanitizeColorFunctions(input: string, cache: Map<string, string>): string {
  return input.replace(UNSUPPORTED_COLOR_FN_PATTERN, (match) => resolveColorToRgb(match, cache));
}

function normalizeComputedColorStyles(clonedDoc: Document, cache: Map<string, string>): void {
  const allNodes = clonedDoc.querySelectorAll<HTMLElement>("*");
  allNodes.forEach((node) => {
    const computed = clonedDoc.defaultView?.getComputedStyle(node);
    if (!computed) {
      return;
    }

    COLOR_STYLE_PROPERTIES.forEach((propertyName) => {
      const currentValue = computed.getPropertyValue(propertyName);
      if (!currentValue || !UNSUPPORTED_COLOR_FN_PATTERN.test(currentValue)) {
        UNSUPPORTED_COLOR_FN_PATTERN.lastIndex = 0;
        return;
      }

      UNSUPPORTED_COLOR_FN_PATTERN.lastIndex = 0;
      node.style.setProperty(propertyName, sanitizeColorFunctions(currentValue, cache));
    });
  });
}

export async function exportElementToPdf(element: HTMLElement, filename: string): Promise<void> {
  const colorCache = new Map<string, string>();

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
    onclone: (clonedDoc) => {
      const styles = clonedDoc.querySelectorAll("style");
      styles.forEach((styleEl) => {
        if (!styleEl.textContent) {
          return;
        }
        styleEl.textContent = sanitizeColorFunctions(styleEl.textContent, colorCache);
      });

      const inlineStyled = clonedDoc.querySelectorAll<HTMLElement>("[style]");
      inlineStyled.forEach((node) => {
        const styleAttr = node.getAttribute("style");
        if (!styleAttr) {
          return;
        }
        node.setAttribute("style", sanitizeColorFunctions(styleAttr, colorCache));
      });

      normalizeComputedColorStyles(clonedDoc, colorCache);
    },
  });

  const imageData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = (canvas.height * pageWidth) / canvas.width;

  pdf.addImage(imageData, "PNG", 0, 0, pageWidth, pageHeight);
  pdf.save(filename);
}

function addWrappedText(
  pdf: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): number {
  const safeText = text?.trim() ? text : "-";
  const lines = pdf.splitTextToSize(safeText, maxWidth) as string[];
  lines.forEach((line) => {
    pdf.text(line, x, y);
    y += lineHeight;
  });
  return y;
}

function ensurePageSpace(pdf: jsPDF, y: number, minSpace: number, startY: number): number {
  const pageHeight = pdf.internal.pageSize.getHeight();
  if (y + minSpace > pageHeight - 32) {
    pdf.addPage();
    return startY;
  }
  return y;
}

// Draw a labelled checkbox: □ Label
function drawCheckbox(pdf: jsPDF, x: number, y: number, label: string): void {
  const size = 9;
  pdf.setDrawColor(80, 80, 80);
  pdf.rect(x, y - size + 1, size, size);
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.text(label, x + size + 3, y);
}

// Draw a horizontal writing line
function drawWritingLine(pdf: jsPDF, x: number, y: number, width: number): void {
  pdf.setDrawColor(160, 160, 160);
  pdf.setLineWidth(0.4);
  pdf.line(x, y, x + width, y);
  pdf.setLineWidth(1);
}

// Draw a bordered box with a label at top-left
function drawLabelledBox(
  pdf: jsPDF,
  label: string,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  pdf.setDrawColor(130, 130, 130);
  pdf.setLineWidth(0.5);
  pdf.rect(x, y, width, height);
  pdf.setFont("helvetica", "bolditalic");
  pdf.setFontSize(7);
  pdf.setTextColor(100, 100, 100);
  pdf.text(label, x + 3, y + 8);
  pdf.setTextColor(0, 0, 0);
}

export async function exportPlanTestCasesToPdf(plan: TestPlan, filename: string): Promise<void> {
  const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const left = 36;
  const right = 36;
  const maxWidth = pageWidth - left - right;
  const startY = 48;
  const lh = 14; // base line height
  let y = startY;

  // ── Cover / header ──────────────────────────────────────────────────────────
  pdf.setFillColor(30, 41, 59); // slate-800
  pdf.rect(0, 0, pageWidth, 32, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(13);
  pdf.setTextColor(255, 255, 255);
  pdf.text("TEST EXECUTION FORM", left, 21);
  pdf.setTextColor(0, 0, 0);

  y = 50;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(15);
  pdf.text(plan.title || "Untitled Plan", left, y);
  y += 18;

  // Meta info grid
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  const meta = [
    ["Plan Type:", plan.type],
    ["Date:", new Date().toLocaleDateString()],
    ["Environment:", `${plan.environment.browser || "—"} / ${plan.environment.os || "—"} / Build: ${plan.environment.buildVersion || "—"}`],
    ["Total Cases:", String(plan.testCases.length)],
  ];
  meta.forEach(([label, value]) => {
    pdf.setFont("helvetica", "bold");
    pdf.text(label, left, y);
    pdf.setFont("helvetica", "normal");
    pdf.text(value, left + 72, y);
    y += lh;
  });

  // Tester / sign-off block
  y += 6;
  const blockH = 28;
  drawLabelledBox(pdf, "Tester Name", left, y, maxWidth * 0.45, blockH);
  drawLabelledBox(pdf, "Signature", left + maxWidth * 0.47, y, maxWidth * 0.28, blockH);
  drawLabelledBox(pdf, "Date", left + maxWidth * 0.77, y, maxWidth * 0.23, blockH);
  y += blockH + 12;

  // Divider
  pdf.setDrawColor(30, 41, 59);
  pdf.setLineWidth(1.2);
  pdf.line(left, y, left + maxWidth, y);
  pdf.setLineWidth(1);
  y += 14;

  // ── Test cases ───────────────────────────────────────────────────────────────
  plan.testCases.forEach((tc, caseIdx) => {
    // ── Case header band ────────────────────────────────────────────────────
    y = ensurePageSpace(pdf, y, 160, startY);

    pdf.setFillColor(241, 245, 249); // slate-100
    pdf.rect(left, y - 11, maxWidth, 16, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.text(`TC-${String(caseIdx + 1).padStart(2, "0")}  ${tc.title || "Untitled Case"}`, left + 4, y);

    // Severity badge (right-aligned)
    const sevColors: Record<string, [number, number, number]> = {
      Critical: [220, 38, 38],
      High: [234, 88, 12],
      Medium: [202, 138, 4],
      Low: [37, 99, 235],
    };
    const [sr, sg, sb] = sevColors[tc.severity] ?? [100, 100, 100];
    pdf.setFontSize(8);
    const sevLabel = tc.severity.toUpperCase();
    const sevW = pdf.getTextWidth(sevLabel) + 8;
    pdf.setFillColor(sr, sg, sb);
    pdf.rect(left + maxWidth - sevW - 4, y - 9, sevW + 2, 12, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.text(sevLabel, left + maxWidth - sevW, y);
    pdf.setTextColor(0, 0, 0);
    y += 10;

    // ── Info rows ──────────────────────────────────────────────────────────
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    if (tc.description?.trim()) {
      y = ensurePageSpace(pdf, y, 24, startY);
      pdf.setFont("helvetica", "bold");
      pdf.text("Description:", left, y);
      pdf.setFont("helvetica", "normal");
      y = addWrappedText(pdf, tc.description, left + 64, y, maxWidth - 64, lh);
    }
    if (tc.preconditions?.trim()) {
      y = ensurePageSpace(pdf, y, 24, startY);
      pdf.setFont("helvetica", "bold");
      pdf.text("Preconditions:", left, y);
      pdf.setFont("helvetica", "normal");
      y = addWrappedText(pdf, tc.preconditions, left + 74, y, maxWidth - 74, lh);
    }
    if (tc.expectedResult?.trim()) {
      y = ensurePageSpace(pdf, y, 24, startY);
      pdf.setFont("helvetica", "bold");
      pdf.text("Expected Result:", left, y);
      pdf.setFont("helvetica", "normal");
      y = addWrappedText(pdf, tc.expectedResult, left + 83, y, maxWidth - 83, lh);
    }
    y += 6;

    // ── Steps table ─────────────────────────────────────────────────────────
    if (tc.steps.length > 0) {
      // Table header
      y = ensurePageSpace(pdf, y, 28, startY);
      const colStep = 28;
      const colAction = maxWidth * 0.38;
      const colExpected = maxWidth * 0.32;
      const colActual = maxWidth - colStep - colAction - colExpected;
      const tableX = left;

      pdf.setFillColor(51, 65, 85); // slate-700
      pdf.rect(tableX, y - 10, maxWidth, 13, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8);
      pdf.setTextColor(255, 255, 255);
      pdf.text("#", tableX + 2, y);
      pdf.text("Action", tableX + colStep + 2, y);
      pdf.text("Expected Outcome", tableX + colStep + colAction + 2, y);
      pdf.text("Actual Outcome (fill in)", tableX + colStep + colAction + colExpected + 2, y);
      pdf.setTextColor(0, 0, 0);
      y += 6;

      tc.steps.forEach((step, stepIdx) => {
        // Calculate row height based on content
        const actionLines = pdf.splitTextToSize(step.action || "—", colAction - 6) as string[];
        const expectedLines = pdf.splitTextToSize(step.expectedOutcome || "—", colExpected - 6) as string[];
        const contentRows = Math.max(actionLines.length, expectedLines.length, 1);
        const rowH = Math.max(contentRows * lh + 8, 28);

        y = ensurePageSpace(pdf, y, rowH + 4, startY);

        // Row background (alternating)
        if (stepIdx % 2 === 0) {
          pdf.setFillColor(248, 250, 252);
          pdf.rect(tableX, y - 10, maxWidth, rowH, "F");
        }

        // Row borders
        pdf.setDrawColor(200, 200, 200);
        pdf.setLineWidth(0.4);
        pdf.rect(tableX, y - 10, maxWidth, rowH);
        pdf.line(tableX + colStep, y - 10, tableX + colStep, y - 10 + rowH);
        pdf.line(tableX + colStep + colAction, y - 10, tableX + colStep + colAction, y - 10 + rowH);
        pdf.line(tableX + colStep + colAction + colExpected, y - 10, tableX + colStep + colAction + colExpected, y - 10 + rowH);

        // Step number
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(9);
        pdf.text(String(stepIdx + 1), tableX + 2, y);

        // Action text
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        let ty = y;
        actionLines.forEach((line) => {
          pdf.text(line, tableX + colStep + 2, ty);
          ty += lh;
        });

        // Expected text
        ty = y;
        expectedLines.forEach((line) => {
          pdf.text(line, tableX + colStep + colAction + 2, ty);
          ty += lh;
        });

        // Actual outcome: blank writing lines
        const actualX = tableX + colStep + colAction + colExpected + 4;
        const actualW = colActual - 10;
        const numLines = Math.max(contentRows, 1);
        for (let i = 0; i < numLines; i++) {
          drawWritingLine(pdf, actualX, y + i * lh + 2, actualW);
        }

        y += rowH - 6;
      });
    }

    y += 8;

    // ── Result / sign-off section ────────────────────────────────────────────
    y = ensurePageSpace(pdf, y, 80, startY);

    // Status checkboxes
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.text("Overall Result:", left, y);
    const checkboxY = y;
    const statuses = ["Pass", "Fail", "Blocked", "Skip"];
    let cbX = left + 88;
    statuses.forEach((s) => {
      drawCheckbox(pdf, cbX, checkboxY, s);
      cbX += pdf.getTextWidth(s) + 22;
    });
    y += 16;

    // Actual result lines
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.text("Actual Result:", left, y);
    y += 4;
    for (let i = 0; i < 3; i++) {
      drawWritingLine(pdf, left, y, maxWidth);
      y += 16;
    }

    // Tester notes lines
    y += 2;
    pdf.setFont("helvetica", "bold");
    pdf.text("Notes:", left, y);
    y += 4;
    for (let i = 0; i < 2; i++) {
      drawWritingLine(pdf, left, y, maxWidth);
      y += 16;
    }

    // Case divider
    y += 6;
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.6);
    pdf.setLineDashPattern([3, 3], 0);
    pdf.line(left, y, left + maxWidth, y);
    pdf.setLineDashPattern([], 0);
    pdf.setLineWidth(1);
    y += 14;
  });

  // ── Summary sign-off page footer ────────────────────────────────────────────
  y = ensurePageSpace(pdf, y, 80, startY);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.text("Execution Sign-Off", left, y);
  y += 14;
  const signFields = ["Tester Name", "Tester Signature", "Date Completed", "Reviewed By", "Review Signature"];
  signFields.forEach((label) => {
    y = ensurePageSpace(pdf, y, 24, startY);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.text(`${label}:`, left, y);
    drawWritingLine(pdf, left + 100, y, maxWidth - 100);
    y += 20;
  });

  pdf.save(filename);
}
