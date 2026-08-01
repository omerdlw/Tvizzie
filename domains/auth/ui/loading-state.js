import AuthPageShell from '@/domains/auth/page-shell';
import { SkeletonBlock, SkeletonLine } from '@/ui/feedback/skeleton';

export default function AuthLoadingState() {
  return (
    <AuthPageShell>
      <div className="space-y-6">
        <div className="space-y-3">
          <SkeletonLine className="w-32" size="sm" />
          <SkeletonLine className="w-56" size="xl" />
          <SkeletonLine className="w-72" size="sm" />
        </div>
        <div className="space-y-3">
          <SkeletonBlock className="h-12 w-full" radius="field" />
          <SkeletonBlock className="h-12 w-full" radius="field" />
          <SkeletonBlock className="h-12 w-full" radius="control" />
        </div>
      </div>
    </AuthPageShell>
  );
}
