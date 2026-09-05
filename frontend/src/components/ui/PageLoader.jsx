/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

/** Skeleton shown while a lazily-loaded page or the session is still resolving. */
export default function PageLoader() {
  return (
    <div className="flex flex-col gap-6 w-full p-6 animate-pulse">
      <div className="h-10 bg-surface-card border border-surface-border rounded-xl w-1/3" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map(index => (
          <div key={index} className="h-28 bg-surface-card border border-surface-border rounded-xl" />
        ))}
      </div>
      <div className="h-64 bg-surface-card border border-surface-border rounded-xl w-full mt-4" />
    </div>
  );
}
