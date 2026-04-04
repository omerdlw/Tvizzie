import { FullscreenState } from '@/ui/states/fullscreen-state';
import { Spinner } from '@/ui/loadings/spinner';

export function Skeleton() {
  return (
    <FullscreenState className="h-screen w-screen" contentClassName="h-screen w-screen">
      <Spinner size={50} />
    </FullscreenState>
  );
}

export default Skeleton;
