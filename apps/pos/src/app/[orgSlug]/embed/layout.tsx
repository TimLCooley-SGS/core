/**
 * Embed layout — minimal chrome for iframe embedding.
 * No header, no footer, just the content.
 */
export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="p-4">{children}</div>;
}
