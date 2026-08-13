export function AccessDeniedPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6">
      <div className="max-w-md rounded-2xl border border-red-400/30 bg-surface-card p-8 text-center shadow-lg">
        <div className="mb-3 text-5xl">⛔</div>
        <h1 className="text-2xl font-bold text-text-primary">Access Denied</h1>
        <p className="mt-3 text-sm text-text-muted">
          You do not have permission to view this page. Please contact your administrator.
        </p>
      </div>
    </div>
  );
}
