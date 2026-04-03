import { FullscreenState } from '@/ui/states/fullscreen-state'
import { Spinner } from '@/ui/loadings/spinner'

export function Skeleton() {
  return (
    <FullscreenState>
      <Spinner size={50} />
    </FullscreenState>
  )
}

export default Skeleton
