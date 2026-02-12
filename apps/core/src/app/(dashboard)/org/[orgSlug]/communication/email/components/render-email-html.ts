import type {
  EmailBlock,
  EmailTemplateSettings,
  HeaderBlockProps,
  HeadingBlockProps,
  TextBlockProps,
  ImageBlockProps,
  ButtonBlockProps,
  DividerBlockProps,
  SpacerBlockProps,
  ColumnsBlockProps,
  SocialBlockProps,
  FooterBlockProps,
} from "@sgscore/types";

const DEFAULT_SETTINGS: EmailTemplateSettings = {
  backgroundColor: "#f4f4f5",
  contentWidth: 600,
  fontFamily: "Arial, Helvetica, sans-serif",
};

function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderHeader(props: HeaderBlockProps, fontFamily: string): string {
  const align = props.alignment || "center";
  return `
<tr>
  <td align="${align}" style="background-color:${esc(props.backgroundColor || "#4E2C70")};padding:24px 32px;">
    ${props.logoUrl ? `<img src="${esc(props.logoUrl)}" alt="${esc(props.logoAlt || "")}" width="${props.logoWidth || 150}" style="display:block;margin:0 auto 12px;" />` : ""}
    ${props.title ? `<h1 style="margin:0;color:${esc(props.textColor || "#ffffff")};font-family:${esc(fontFamily)};font-size:24px;font-weight:700;">${esc(props.title)}</h1>` : ""}
  </td>
</tr>`;
}

function renderHeading(props: HeadingBlockProps, fontFamily: string): string {
  const tag = props.level === "h2" ? "h2" : "h1";
  const size = props.level === "h2" ? "20px" : "28px";
  return `
<tr>
  <td style="padding:16px 32px;">
    <${tag} style="margin:0;color:${esc(props.color || "#111111")};font-family:${esc(fontFamily)};font-size:${size};font-weight:700;text-align:${props.alignment || "left"};">${esc(props.text)}</${tag}>
  </td>
</tr>`;
}

function renderText(props: TextBlockProps, fontFamily: string): string {
  return `
<tr>
  <td style="padding:8px 32px;color:${esc(props.color || "#374151")};font-family:${esc(fontFamily)};font-size:16px;line-height:1.6;text-align:${props.alignment || "left"};">
    ${props.html}
  </td>
</tr>`;
}

function renderImage(props: ImageBlockProps, contentWidth: number): string {
  if (!props.src) return "";
  const maxW = Math.min(props.width || contentWidth - 64, contentWidth - 64);
  const img = `<img src="${esc(props.src)}" alt="${esc(props.alt || "")}" width="${maxW}" style="display:block;max-width:100%;height:auto;" />`;
  const wrapped = props.href ? `<a href="${esc(props.href)}" target="_blank">${img}</a>` : img;
  return `
<tr>
  <td align="${props.alignment || "center"}" style="padding:16px 32px;">
    ${wrapped}
  </td>
</tr>`;
}

function renderButton(props: ButtonBlockProps, fontFamily: string): string {
  const radius = props.borderRadius ?? 6;
  const width = props.fullWidth ? "width:100%;" : "";
  return `
<tr>
  <td align="${props.alignment || "center"}" style="padding:16px 32px;">
    <!--[if mso]>
    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${esc(props.href || "#")}" style="height:44px;v-text-anchor:middle;${width}" arcsize="${Math.round((radius / 22) * 100)}%" strokecolor="${esc(props.backgroundColor || "#4E2C70")}" fillcolor="${esc(props.backgroundColor || "#4E2C70")}">
      <w:anchorlock/>
      <center style="color:${esc(props.textColor || "#ffffff")};font-family:${esc(fontFamily)};font-size:16px;font-weight:600;">${esc(props.text)}</center>
    </v:roundrect>
    <![endif]-->
    <!--[if !mso]><!-->
    <a href="${esc(props.href || "#")}" target="_blank" style="display:inline-block;${width}background-color:${esc(props.backgroundColor || "#4E2C70")};color:${esc(props.textColor || "#ffffff")};font-family:${esc(fontFamily)};font-size:16px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:${radius}px;text-align:center;mso-hide:all;">${esc(props.text)}</a>
    <!--<![endif]-->
  </td>
</tr>`;
}

function renderDivider(props: DividerBlockProps): string {
  return `
<tr>
  <td style="padding:${props.padding ?? 16}px 32px;">
    <hr style="border:none;border-top:${props.thickness ?? 1}px ${props.style || "solid"} ${esc(props.color || "#e5e7eb")};margin:0;" />
  </td>
</tr>`;
}

function renderSpacer(props: SpacerBlockProps): string {
  return `
<tr>
  <td style="height:${props.height ?? 32}px;font-size:0;line-height:0;">&nbsp;</td>
</tr>`;
}

function renderColumns(props: ColumnsBlockProps, contentWidth: number, fontFamily: string): string {
  const cols = props.columns || [];
  const gap = props.gap ?? 16;
  const ratio = props.ratio || "50-50";
  const parts = ratio.split("-").map(Number);
  const total = parts.reduce((a, b) => a + b, 0);
  const availableWidth = contentWidth - 64 - gap * (parts.length - 1);

  let columnsTd = "";
  for (let i = 0; i < parts.length; i++) {
    const w = Math.round((parts[i] / total) * availableWidth);
    const content = cols[i]?.html || "";
    columnsTd += `
      <td width="${w}" valign="top" style="width:${w}px;padding:0 ${i < parts.length - 1 ? gap / 2 : 0}px 0 ${i > 0 ? gap / 2 : 0}px;font-family:${esc(fontFamily)};font-size:16px;line-height:1.6;color:#374151;">
        ${content}
      </td>`;
  }

  return `
<tr>
  <td style="padding:16px 32px;">
    <!--[if mso]>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${columnsTd}</tr></table>
    <![endif]-->
    <!--[if !mso]><!-->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="table-layout:fixed;"><tr>${columnsTd}</tr></table>
    <!--<![endif]-->
  </td>
</tr>`;
}

const SOCIAL_ICONS: Record<string, string> = {
  facebook: "https://cdn-icons-png.flaticon.com/24/733/733547.png",
  twitter: "https://cdn-icons-png.flaticon.com/24/733/733579.png",
  instagram: "https://cdn-icons-png.flaticon.com/24/2111/2111463.png",
  linkedin: "https://cdn-icons-png.flaticon.com/24/733/733561.png",
  youtube: "https://cdn-icons-png.flaticon.com/24/733/733646.png",
  website: "https://cdn-icons-png.flaticon.com/24/1006/1006771.png",
};

function renderSocial(props: SocialBlockProps): string {
  const size = props.iconSize || 24;
  const links = (props.links || [])
    .filter((l) => l.url)
    .map(
      (l) =>
        `<a href="${esc(l.url)}" target="_blank" style="display:inline-block;margin:0 6px;"><img src="${esc(SOCIAL_ICONS[l.platform] || SOCIAL_ICONS.website)}" alt="${esc(l.platform)}" width="${size}" height="${size}" style="display:block;" /></a>`,
    )
    .join("");

  return `
<tr>
  <td align="${props.alignment || "center"}" style="padding:16px 32px;">
    ${links}
  </td>
</tr>`;
}

function renderFooter(props: FooterBlockProps, fontFamily: string): string {
  return `
<tr>
  <td style="background-color:${esc(props.backgroundColor || "#f9fafb")};padding:24px 32px;text-align:${props.alignment || "center"};color:${esc(props.color || "#6b7280")};font-family:${esc(fontFamily)};font-size:13px;line-height:1.5;">
    ${props.html ? props.html : ""}
    ${props.companyName ? `<strong>${esc(props.companyName)}</strong><br/>` : ""}
    ${props.address ? `${esc(props.address)}<br/>` : ""}
    <br/>
    <a href="{{unsubscribe_url}}" style="color:${esc(props.color || "#6b7280")};text-decoration:underline;">Unsubscribe</a>
  </td>
</tr>`;
}

function renderBlock(
  block: EmailBlock,
  settings: EmailTemplateSettings,
): string {
  const font = settings.fontFamily;
  const width = settings.contentWidth;

  switch (block.type) {
    case "header":
      return renderHeader(block.props as HeaderBlockProps, font);
    case "heading":
      return renderHeading(block.props as HeadingBlockProps, font);
    case "text":
      return renderText(block.props as TextBlockProps, font);
    case "image":
      return renderImage(block.props as ImageBlockProps, width);
    case "button":
      return renderButton(block.props as ButtonBlockProps, font);
    case "divider":
      return renderDivider(block.props as DividerBlockProps);
    case "spacer":
      return renderSpacer(block.props as SpacerBlockProps);
    case "columns":
      return renderColumns(block.props as ColumnsBlockProps, width, font);
    case "social":
      return renderSocial(block.props as SocialBlockProps);
    case "footer":
      return renderFooter(block.props as FooterBlockProps, font);
    default:
      return "";
  }
}

export function renderEmailHtml(
  blocks: EmailBlock[],
  settings: Partial<EmailTemplateSettings> = {},
  preheader?: string,
): string {
  const s: EmailTemplateSettings = { ...DEFAULT_SETTINGS, ...settings };
  const blocksHtml = blocks.map((b) => renderBlock(b, s)).join("\n");

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="x-apple-disable-message-reformatting" />
  <title></title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    * { box-sizing: border-box; }
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    table { border-collapse: collapse !important; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    body { margin: 0; padding: 0; width: 100% !important; }
    @media only screen and (max-width: 620px) {
      .email-container { width: 100% !important; max-width: 100% !important; }
      .email-container td { padding-left: 16px !important; padding-right: 16px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${esc(s.backgroundColor)};font-family:${esc(s.fontFamily)};">
  ${preheader ? `<div style="display:none;font-size:1px;color:${esc(s.backgroundColor)};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${esc(preheader)}</div>` : ""}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${esc(s.backgroundColor)};">
    <tr>
      <td align="center" style="padding:24px 0;">
        <!--[if mso]>
        <table role="presentation" width="${s.contentWidth}" cellpadding="0" cellspacing="0"><tr><td>
        <![endif]-->
        <table role="presentation" class="email-container" width="${s.contentWidth}" cellpadding="0" cellspacing="0" style="max-width:${s.contentWidth}px;width:100%;background-color:#ffffff;border-radius:8px;overflow:hidden;">
          ${blocksHtml}
        </table>
        <!--[if mso]>
        </td></tr></table>
        <![endif]-->
      </td>
    </tr>
  </table>
</body>
</html>`;
}
