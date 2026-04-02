  import { AccountNotFoundState } from '@/features/account/page-shell'

  export default function NotFound() {
    return (
      <AccountNotFoundState description="We couldn't find this account. It may have been removed, made private, or the username may be incorrect." />
    )
  }
