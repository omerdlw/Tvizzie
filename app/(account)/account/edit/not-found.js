import { FullscreenState } from '@/ui/states/fullscreen-state'

export default function NotFound() {
  return (
    <FullscreenState contentClassName="center h-full w-full flex-col gap-3 p-6 text-center">
      <h1>Account editor unavailable</h1>
      <p>
        The account editor is unavailable because the account details could not
        be loaded.
      </p>
    </FullscreenState>
  )
}
