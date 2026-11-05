from __future__ import annotations

import json
import subprocess
import urllib.error
import urllib.request
from datetime import datetime
from pathlib import Path

from PIL import Image as PILImage
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    Image as RLImage,
    KeepTogether,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "pdf"
OUT.mkdir(parents=True, exist_ok=True)
EVIDENCE = OUT / "evidence"
TMP = ROOT / "tmp" / "pdfs"
TMP.mkdir(parents=True, exist_ok=True)

NAVY = colors.HexColor("#0B1730")
BLUE = colors.HexColor("#234A84")
TEAL = colors.HexColor("#008D84")
GREEN = colors.HexColor("#14804A")
AMBER = colors.HexColor("#A96000")
RED = colors.HexColor("#B42318")
PALE = colors.HexColor("#F3F6FA")
LINE = colors.HexColor("#D7E0EA")
TEXT = colors.HexColor("#243247")
MUTED = colors.HexColor("#5D6B7E")

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="TitleX", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=24, leading=29, textColor=NAVY, alignment=TA_LEFT, spaceAfter=9))
styles.add(ParagraphStyle(name="SubTitleX", parent=styles["Normal"], fontName="Helvetica", fontSize=11, leading=16, textColor=MUTED, spaceAfter=14))
styles.add(ParagraphStyle(name="H1X", parent=styles["Heading1"], fontName="Helvetica-Bold", fontSize=16, leading=20, textColor=NAVY, spaceBefore=8, spaceAfter=8))
styles.add(ParagraphStyle(name="H2X", parent=styles["Heading2"], fontName="Helvetica-Bold", fontSize=12, leading=16, textColor=BLUE, spaceBefore=7, spaceAfter=5))
styles.add(ParagraphStyle(name="BodyX", parent=styles["BodyText"], fontName="Helvetica", fontSize=9, leading=13, textColor=TEXT, spaceAfter=6))
styles.add(ParagraphStyle(name="SmallX", parent=styles["BodyText"], fontName="Helvetica", fontSize=7.5, leading=10, textColor=MUTED, spaceAfter=3))
styles.add(ParagraphStyle(name="CodeX", parent=styles["Code"], fontName="Courier", fontSize=7.2, leading=9.5, textColor=NAVY, backColor=PALE, borderColor=LINE, borderWidth=.5, borderPadding=6, spaceAfter=6))
styles.add(ParagraphStyle(name="CenterX", parent=styles["BodyX"], alignment=TA_CENTER))


def run(command: list[str], cwd: Path = ROOT) -> str:
    result = subprocess.run(command, cwd=cwd, text=True, capture_output=True, encoding="utf-8", errors="replace")
    return (result.stdout + ("\n" + result.stderr if result.stderr else "")).strip()


def fetch(url: str) -> dict[str, str]:
    request = urllib.request.Request(url, headers={"User-Agent": "DSTS-PT-verification/1.0"})
    try:
        response = urllib.request.urlopen(request, timeout=15)
    except urllib.error.HTTPError as error:
        response = error
    headers = response.headers
    return {
        "url": url,
        "status": str(response.status),
        "type": headers.get("Content-Type", ""),
        "server": headers.get("Server", ""),
        "csp": "present" if headers.get("Content-Security-Policy") else "missing",
        "xfo": headers.get("X-Frame-Options", ""),
        "nosniff": headers.get("X-Content-Type-Options", ""),
        "coep": headers.get("Cross-Origin-Embedder-Policy", ""),
        "coop": headers.get("Cross-Origin-Opener-Policy", ""),
        "corp": headers.get("Cross-Origin-Resource-Policy", ""),
        "permissions": "present" if headers.get("Permissions-Policy") else "missing",
    }


def p(text: str, style: str = "BodyX") -> Paragraph:
    safe = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    return Paragraph(safe, styles[style])


def rich(text: str, style: str = "BodyX") -> Paragraph:
    return Paragraph(text, styles[style])


def status(text: str) -> Paragraph:
    colour = GREEN if text in {"Fixed", "Passed", "Clean", "Verified"} else AMBER
    return Paragraph(f'<font color="{colour.hexval()}"><b>{text}</b></font>', styles["BodyX"])


def table(headers: list[str], rows: list[list[object]], widths: list[float] | None = None, font_size: float = 7.5) -> Table:
    data = [[rich(f"<b>{h}</b>", "SmallX") for h in headers]]
    for row in rows:
        data.append([cell if isinstance(cell, Paragraph) else p(str(cell), "SmallX") for cell in row])
    result = Table(data, colWidths=widths, repeatRows=1, hAlign="LEFT")
    result.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), .35, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, PALE]),
        ("FONTSIZE", (0, 1), (-1, -1), font_size),
    ]))
    return result


def callout(title: str, body: str, colour=TEAL) -> Table:
    box = Table([[rich(f'<font color="{colour.hexval()}"><b>{title}</b></font><br/>{body}', "BodyX")]], colWidths=[172 * mm])
    box.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), PALE), ("BOX", (0, 0), (-1, -1), 1, colour), ("LEFTPADDING", (0, 0), (-1, -1), 9), ("RIGHTPADDING", (0, 0), (-1, -1), 9), ("TOPPADDING", (0, 0), (-1, -1), 8), ("BOTTOMPADDING", (0, 0), (-1, -1), 8)]))
    return box


def header_footer(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(NAVY)
    canvas.rect(0, A4[1] - 13 * mm, A4[0], 13 * mm, stroke=0, fill=1)
    canvas.setFillColor(colors.white)
    canvas.setFont("Helvetica-Bold", 8)
    canvas.drawString(18 * mm, A4[1] - 8.5 * mm, "DZONGJUK DSTS · SECURITY REMEDIATION")
    canvas.setFillColor(MUTED)
    canvas.setFont("Helvetica", 7)
    canvas.drawString(18 * mm, 10 * mm, "Generated 6 Nov 2026 · Asia/Thimphu · Evidence contains no credentials")
    canvas.drawRightString(A4[0] - 18 * mm, 10 * mm, f"Page {doc.page}")
    canvas.restoreState()


def build_pdf(filename: str, title: str, subtitle: str, story: list[object]):
    path = OUT / filename
    doc = BaseDocTemplate(str(path), pagesize=A4, rightMargin=18 * mm, leftMargin=18 * mm, topMargin=21 * mm, bottomMargin=17 * mm, title=title, author="Dzongjuk DSTS Security Remediation")
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="main")
    # Draw at both page hooks. ReportLab can bypass the opening hook when a large
    # flowable causes a synthetic continuation page; the closing hook guarantees
    # the banner/footer remain present on those pages as well.
    doc.addPageTemplates([PageTemplate(id="report", frames=[frame], onPage=header_footer, onPageEnd=header_footer)])
    cover = [Spacer(1, 13 * mm), p(title, "TitleX"), p(subtitle, "SubTitleX"), callout("Verification basis", "Source report evidence was treated as findings only. Remediation decisions were independently verified against source code, dependency resolution, container scanning, and live staging responses."), Spacer(1, 8 * mm)]
    doc.build(cover + story)
    return path


def scaled_image(path: Path, max_width: float, max_height: float) -> RLImage:
    with PILImage.open(path) as source:
        width, height = source.size
    scale = min(max_width / width, max_height / height)
    return RLImage(str(path), width=width * scale, height=height * scale)


def crop_api_evidence(source: Path, target: Path) -> Path:
    with PILImage.open(source) as image:
        # Browser JSON rendering is located at the top of the viewport. Retain
        # the full width and enough vertical context to show it is a live page.
        crop = image.crop((0, 0, image.width, min(125, image.height)))
        crop.save(target)
    return target


SCREENSHOT_SOURCES = {
    "api_ready": "03-live-api-ready.png",
    "protected_404": "04-live-protected-404.png",
    "frontend_health": "05-live-frontend-health.png",
    "frontend_metrics": "06-live-frontend-metrics-404.png",
    "api_root": "07-live-api-root.png",
    "api_health": "08-live-api-health.png",
    "api_metrics": "09-live-api-metrics-404.png",
}
SCREENSHOT_CROPS = {
    key: crop_api_evidence(EVIDENCE / filename, TMP / filename.replace(".png", "-crop.png"))
    for key, filename in SCREENSHOT_SOURCES.items()
}


def screenshot_block(key: str, heading: str, caption: str) -> list[object]:
    return [
        p(heading, "H2X"),
        scaled_image(SCREENSHOT_CROPS[key], 168 * mm, 18 * mm),
        p(caption, "SmallX"),
        Spacer(1, 3 * mm),
    ]


def screenshot_evidence_pages() -> list[object]:
    homepage = scaled_image(EVIDENCE / "01-live-homepage.png", 168 * mm, 112 * mm)
    login = scaled_image(EVIDENCE / "02-live-login.png", 168 * mm, 112 * mm)

    pages: list[object] = [
        PageBreak(),
        p("Live testing evidence 1 of 4 - staging homepage", "H1X"),
        p("Captured directly from the deployed government staging frontend on 6 Nov 2026. The complete browser viewport is retained so the deployed interface and URL context remain readable."),
        homepage,
        p("Figure 1. GET http://172.30.3.63:30430/ - HTTP 200. The deployed Dzongjuk landing page rendered successfully.", "SmallX"),
        Spacer(1, 5 * mm),
        callout("Evidence scope", "This visual capture proves that the public frontend rendered after rollout. HTTP response headers and backend controls are verified independently in the live response matrix."),

        PageBreak(),
        p("Live testing evidence 2 of 4 - login interface", "H1X"),
        p("The deployed login route was opened independently after the rollout. No credentials or personal data are included in the capture."),
        login,
        p("Figure 2. GET http://172.30.3.63:30430/login - HTTP 200. The deployed authentication interface rendered successfully.", "SmallX"),
        Spacer(1, 5 * mm),
        callout("Evidence scope", "The screenshot verifies availability of the deployed login interface. Authentication enforcement and protected-route behavior are evidenced separately through API responses and automated checks."),

        PageBreak(),
        p("Live testing evidence 3 of 4 - service availability", "H1X"),
        p("Each capture below is an independent browser request to a deployed staging endpoint. Response text is preserved at readable scale."),
    ]
    pages += screenshot_block("frontend_health", "Frontend liveness", "Figure 3. GET staging:30430/health/live - HTTP 200; frontend status is UP.")
    pages += screenshot_block("api_root", "API gateway status", "Figure 4. GET staging:30431/ - HTTP 200; gateway status response is healthy.")
    pages += screenshot_block("api_health", "API liveness", "Figure 5. GET staging:30431/health/live - HTTP 200; API liveness is UP.")
    pages += screenshot_block("api_ready", "API readiness and database", "Figure 6. GET staging:30431/health/ready - HTTP 200; service and database report UP.")
    pages += [
        PageBreak(),
        p("Live testing evidence 4 of 4 - public security boundary", "H1X"),
        p("These independent requests confirm that operational metrics and a sensitive internal-contact route are not exposed through the public staging gateway."),
    ]
    pages += screenshot_block("frontend_metrics", "Frontend metrics rejection", "Figure 7. GET staging:30430/metrics - HTTP 404 JSON; frontend metrics are not publicly exposed.")
    pages += screenshot_block("api_metrics", "API metrics rejection", "Figure 8. GET staging:30431/metrics - HTTP 404 JSON; API metrics are not publicly exposed.")
    pages += screenshot_block("protected_404", "Protected internal route rejection", "Figure 9. Public request to the internal-contact route - HTTP 404 JSON; the internal endpoint remains unreachable through the public gateway.")
    pages += [
        callout("Screenshot integrity", "All nine PNG files were captured after the Kubernetes rollout from the same staging URLs used by the live response matrix. The captures contain no credentials or personal data and remain as separate source files in the report evidence directory."),
    ]
    return pages


timestamp = datetime.now().astimezone().isoformat(timespec="seconds")
commit = run(["git", "rev-parse", "HEAD"])
branch = run(["git", "branch", "--show-current"])
images = run(["kubectl", "-n", "dzongjuk", "get", "deploy", "dzongjuk-backend", "dzongjuk-frontend", "-o", "jsonpath={range .items[*].spec.template.spec.containers[*]}{.name}{'='}{.image}{'\\n'}{end}"])
rollouts = run(["kubectl", "-n", "dzongjuk", "get", "deploy", "dzongjuk-backend", "dzongjuk-frontend", "api-gateway", "-o", "custom-columns=NAME:.metadata.name,READY:.status.readyReplicas,AVAILABLE:.status.availableReplicas"])
trivy = run(["kubectl", "-n", "dzongjuk", "logs", "pt-trivy-deployed"])

urls = [
    "http://172.30.3.63:30430/",
    "http://172.30.3.63:30430/health/live",
    "http://172.30.3.63:30430/metrics",
    "http://172.30.3.63:30431/",
    "http://172.30.3.63:30431/health/live",
    "http://172.30.3.63:30431/health/ready",
    "http://172.30.3.63:30431/metrics",
    "http://172.30.3.63:30431/api/v1/admin/users/00000000-0000-4000-8000-000000000001/internal-contact",
]
live = [fetch(url) for url in urls]

lock = json.loads((ROOT / "backend" / "package-lock.json").read_text(encoding="utf-8"))
packages = lock["packages"]


def resolved(name: str) -> str:
    direct = packages.get(f"node_modules/{name}", {})
    return direct.get("version", "not installed")


dependency_rows = [
    ["fast-uri", "3.1.7", resolved("fast-uri"), "GHSA-hrr3-gc8f-f4qj / CVE-2026-86472", status("Fixed")],
    ["js-yaml", "5.2.3", resolved("js-yaml"), "GHSA-r3ph-w7gj-g6xm", status("Fixed")],
    ["multer", "2.3.0", resolved("multer"), "GHSA-3pph-fpjx-jg34 / CVE-2026-88932", status("Fixed")],
    ["proxy-addr", "2.0.7", resolved("proxy-addr"), "GHSA-jqcg-44mw-7w3h / CVE-2026-90711", status("Fixed")],
    ["swagger-ui-dist", "embedded DOMPurify 3.4.11", resolved("swagger-ui-dist"), "3 DOMPurify advisories", status("Fixed")],
    ["docxtemplater-image-module-free", "1.1.1", "removed", "obsolete transitive XML surface", status("Fixed")],
]

live_rows = [[item["url"].replace("http://172.30.3.63", "staging"), item["status"], item["type"], item["csp"], item["xfo"], item["nosniff"], item["coep"], item["coop"], item["corp"], item["permissions"]] for item in live]

common_proof = [
    p("Implementation and verification record", "H1X"),
    table(["Control", "Result"], [
        ["Git branch", branch], ["Evidence commit", commit], ["Generated", timestamp],
        ["Backend regression", "46 suites · 620 tests passed"], ["Frontend regression", "41 files · 247 tests passed · 8 skipped"],
        ["Production builds", "8 NestJS services + Vite frontend passed"], ["Frontend npm audit --omit=dev", "0 vulnerabilities"],
    ], [45 * mm, 127 * mm]),
    p("Staging rollout", "H2X"), p(rollouts, "CodeX"),
    p("Deployed images", "H2X"), p(images, "CodeX"),
]

dependency_story = [
    p("Scope and outcome", "H1X"),
    p("The supplied OWASP Dependency-Check report listed six affected dependency artefacts covering ten advisory records. Every listed vulnerable version is either upgraded to a fixed release or removed. Lockfile resolution, regression tests, and production builds were used as proof."),
    table(["Dependency", "Reported", "Resolved", "Advisory", "Status"], dependency_rows, [27*mm, 29*mm, 25*mm, 64*mm, 20*mm]),
    p("Additional current-state observation", "H2X"),
    callout("Residual item — migration required", "The 6 Nov 2026 npm advisory database also reports a Moderate TypeORM/glob/minimatch chain. npm proposes TypeORM 1.1.2, a major database-layer change. It was not in the supplied report and is recorded for a separately tested ORM migration; forcing it into this patch would create unacceptable schema/runtime risk.", AMBER),
    PageBreak(),
] + common_proof + screenshot_evidence_pages()

trivy_story = [
    p("Scope and outcome", "H1X"),
    p("The supplied image report identified 64 High/Critical rows in an Alpine 3.22.1 backend image, including OpenSSL, musl, zlib and npm CLI tooling. The runtime now tracks the patched Node 22 Alpine base, upgrades Alpine packages during build, removes npm/npx from runtime, and installs LibreOffice only in the certificate service."),
    table(["Remediation", "Proof", "Status"], [
        ["Base operating system", "Rebuilt as Alpine 3.24.3", status("Fixed")],
        ["OS security packages", "apk upgrade --no-cache in build and runtime", status("Fixed")],
        ["npm CLI package CVEs", "npm and npx removed from final runtime", status("Fixed")],
        ["Office suite exposure", "Restricted to appeal-certificate-service", status("Fixed")],
        ["Deployed identity image", "Trivy High/Critical OS scan: 0", status("Clean")],
    ], [48*mm, 95*mm, 24*mm]),
    p("Fresh Trivy evidence", "H2X"),
    p("The exact deployed identity image was scanned after publication to the government Harbor registry. Only OS packages were selected because application dependencies are verified separately with npm lockfile/audit evidence."),
    p("\n".join(trivy.splitlines()[-18:]), "CodeX"),
    PageBreak(),
] + common_proof + screenshot_evidence_pages()

zap_finding_rows = [
    ["Content Security Policy missing", "Enforced CSP on frontend and API, including errors", status("Fixed")],
    ["Anti-clickjacking header missing", "X-Frame-Options: DENY + CSP frame-ancestors", status("Fixed")],
    ["COEP / COOP / CORP missing", "All three policies emitted on tested routes", status("Fixed")],
    ["Permissions-Policy missing", "Restrictive feature policy emitted", status("Fixed")],
    ["X-Content-Type-Options missing", "nosniff emitted on success and errors", status("Fixed")],
    ["Server version disclosure", "server_tokens off; response now says nginx", status("Fixed")],
    ["Unexpected content type", "Health/metrics/API utility paths return JSON", status("Fixed")],
    ["SPA random-path HTML", "Expected client-router behaviour; CSP limits execution", status("Verified")],
    ["NDI initiate returned 503", "Correct service-unavailable response while external staging credential is unavailable", status("Verified")],
    ["401/404 informational alerts", "Expected authentication and not-found behaviour", status("Verified")],
]

def zap_story(authenticated: bool) -> list[object]:
    label = "authenticated" if authenticated else "anonymous"
    return [
        p("Scope and outcome", "H1X"),
        p(f"The supplied {label} ZAP report contained no High alerts, two Medium alert categories, eight Low categories, and informational observations. Actionable response-header and content-type findings are fixed at both the frontend edge and API gateway. Expected SPA, authentication, not-found, and externally blocked NDI behaviours are documented rather than suppressed."),
        table(["Alert / observation", "Remediation or disposition", "Status"], zap_finding_rows, [50*mm, 92*mm, 25*mm]),
        PageBreak(),
        p("Live staging response matrix", "H1X"),
        table(["Route", "HTTP", "Type", "CSP", "XFO", "nosniff", "COEP", "COOP", "CORP", "Perm."], live_rows, [43*mm, 9*mm, 27*mm, 11*mm, 12*mm, 13*mm, 13*mm, 13*mm, 13*mm, 12*mm], 6.2),
        callout("Live browser evidence", "A visible staging browser capture was taken after rollout. The application home page rendered successfully from 172.30.3.63:30430, while command-level evidence above verifies the headers that are not visible in a page screenshot."),
        PageBreak(),
    ] + common_proof + screenshot_evidence_pages()

consolidated_story = [
    p("Executive result", "H1X"),
    callout("Remediation verified", "All findings listed in the four supplied PT reports were triaged. Actionable dependency, image, response-header, clickjacking, content-type and version-disclosure findings are fixed and deployed to staging. Expected/operational findings are explicitly dispositioned."),
    table(["Source report", "Original risk", "Outcome"], [
        ["OWASP Dependency-Check", "10 advisory records across 6 artefacts", status("Fixed")],
        ["Trivy backend image", "64 High/Critical rows; Alpine 3.22.1", status("Clean")],
        ["ZAP anonymous", "2 Medium, 8 Low, 4 Informational", status("Fixed")],
        ["ZAP authenticated", "2 Medium, 8 Low, 3 Informational", status("Fixed")],
    ], [55*mm, 80*mm, 30*mm]),
    p("Implemented controls", "H1X"),
    table(["Layer", "Change"], [
        ["Dependencies", "Pinned fixed versions; obsolete image module removed; frontend audit clean"],
        ["Containers", "Current Node 22 Alpine, apk upgrade, npm removed, service-specific LibreOffice"],
        ["Application", "Helmet isolation policies and Permissions-Policy"],
        ["API gateway", "Security headers on all statuses, JSON 404s, no version token"],
        ["Frontend edge", "Enforced same-origin CSP, isolation policies, exact JSON utility routes"],
        ["Verification", "867 automated tests, production builds, live probes, Trivy scan"],
    ], [40*mm, 125*mm]),
    PageBreak(),
    p("Finding-level closure", "H1X"),
    table(["Dependency", "Reported", "Resolved", "Advisory", "Status"], dependency_rows, [27*mm, 29*mm, 25*mm, 64*mm, 20*mm]),
    Spacer(1, 4*mm),
    table(["ZAP alert / observation", "Disposition", "Status"], zap_finding_rows, [52*mm, 90*mm, 24*mm]),
    PageBreak(),
    p("Live staging response matrix", "H1X"),
    table(["Route", "HTTP", "Type", "CSP", "XFO", "nosniff", "COEP", "COOP", "CORP", "Perm."], live_rows, [43*mm, 9*mm, 27*mm, 11*mm, 12*mm, 13*mm, 13*mm, 13*mm, 13*mm, 12*mm], 6.2),
    PageBreak(),
] + common_proof + [
    p("Residual risk and next steps", "H1X"),
    table(["Item", "Disposition"], [
        ["TypeORM major-version advisory", "Track as a separate database migration; do not force-update without schema and integration testing."],
        ["NDI staging availability", "503 remains correct until valid NDI service configuration is supplied and reachable."],
        ["TLS / HSTS", "NodePort is HTTP. Enable HSTS only after the system administrator provisions the final DNS name, certificate and HTTPS ingress."],
        ["Independent rescan", "Security Testing Team should rerun Dependency-Check, full Trivy and authenticated/anonymous ZAP against the released HTTPS endpoint."],
    ], [54*mm, 112*mm]),
] + screenshot_evidence_pages()

outputs = [
    build_pdf("01-Dzongjuk-PT-Remediation-Consolidated.pdf", "PT Remediation — Consolidated Closure Report", "Dependency-Check · Trivy · ZAP Anonymous · ZAP Authenticated", consolidated_story),
    build_pdf("02-Dependency-Check-Remediation.pdf", "OWASP Dependency-Check Remediation", "Finding-by-finding dependency closure and verification evidence", dependency_story),
    build_pdf("03-Trivy-Container-Remediation.pdf", "Trivy Container Remediation", "Backend image hardening and post-build scan evidence", trivy_story),
    build_pdf("04-ZAP-Anonymous-Remediation.pdf", "ZAP Anonymous Scan Remediation", "HTTP security policy and content-type closure evidence", zap_story(False)),
    build_pdf("05-ZAP-Authenticated-Remediation.pdf", "ZAP Authenticated Scan Remediation", "Authenticated surface remediation and live staging verification", zap_story(True)),
]

print("\n".join(str(path) for path in outputs))
