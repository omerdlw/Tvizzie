import { AuthInteractiveBoundary } from '@/app/_shell/interactive-boundary';

export default function AuthLayout({ children }) {
  return <AuthInteractiveBoundary>{children}</AuthInteractiveBoundary>;
}
