import { FullscreenState } from '@/ui/fullscreen-state'
import { Spinner } from '@/ui/spinner/index'

export function Skeleton() {
  return (
    <FullscreenState>
      <Spinner size={50} />
    </FullscreenState>
  )
}

export default Skeleton
