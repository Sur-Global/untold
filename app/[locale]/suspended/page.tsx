export default function SuspendedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="max-w-md space-y-4 text-center">
        <h1 className="font-mono text-2xl uppercase tracking-wide">Account Suspended</h1>
        <p className="text-muted-foreground">
          Your account has been suspended. If you believe this is a mistake, please contact us.
        </p>
        <a href="mailto:hello@untold.ink" className="text-sm underline">
          hello@untold.ink
        </a>
      </div>
    </div>
  )
}
