interface PosFooterProps {
  orgName: string;
}

export function PosFooter({ orgName }: PosFooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t py-8 text-center text-sm text-muted-foreground">
      <p>
        &copy; {year} {orgName}
      </p>
      <p className="mt-1">
        Powered by{" "}
        <a
          href="https://socialgoodsoftware.com"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-foreground"
        >
          Social Good Software
        </a>
      </p>
    </footer>
  );
}
