import Link from 'next/link';

import AuthPoster from './poster';
import { AUTH_PAGE_STYLES } from './styles';

export default function AuthPageShell({ cardEyebrow, title, subtitle, switchCopy, switchHref, switchLabel, children }) {
  return (
    <main className={AUTH_PAGE_STYLES.page}>
      {/* Left Column (Content) */}
      <div className={AUTH_PAGE_STYLES.leftColumn}>
        <div className={AUTH_PAGE_STYLES.frame}>
          <section className={AUTH_PAGE_STYLES.card}>
            <div className={AUTH_PAGE_STYLES.mobileHeader}>
              {cardEyebrow ? <p className={AUTH_PAGE_STYLES.cardEyebrow}>{cardEyebrow}</p> : null}
              <h1 className={AUTH_PAGE_STYLES.title}>{title}</h1>
              <p className={AUTH_PAGE_STYLES.subtitle}>{subtitle}</p>
              {switchCopy && switchHref && switchLabel ? (
                <p className={AUTH_PAGE_STYLES.switchCopy}>
                  {switchCopy}{' '}
                  <Link href={switchHref} className={AUTH_PAGE_STYLES.switchLink}>
                    {switchLabel}
                  </Link>
                </p>
              ) : null}
            </div>
            {children}
          </section>
        </div>
      </div>

      {/* Right Column (Poster) */}
      <div className={AUTH_PAGE_STYLES.rightColumn}>
        <AuthPoster />
      </div>
    </main>
  );
}
