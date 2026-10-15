import { Fragment, type JSX } from "react";

// A line that changes a word at a time, each out of its own line, over the
// last one going. The change count keys it, so every change plays afresh.
export function Words({
  change,
  now,
  was,
}: {
  change: number;
  now: string;
  was?: string;
}): JSX.Element {
  const words = now.split(" ");

  return (
    <>
      <span key={`now-${change}`} className="block">
        {change > 0
          ? words.map((word, index) => (
              <Fragment key={index}>
                <span className="-my-[0.14em] inline-block overflow-hidden py-[0.14em] align-top">
                  <span
                    className="home-word-in inline-block"
                    style={{ animationDelay: `${120 + index * 55}ms` }}
                  >
                    {word}
                  </span>
                </span>
                {index < words.length - 1 ? " " : null}
              </Fragment>
            ))
          : now}
      </span>
      {was ? (
        <span
          key={`was-${change}`}
          aria-hidden
          className="home-title-out pointer-events-none absolute inset-x-0 top-0 block"
        >
          {was}
        </span>
      ) : null}
    </>
  );
}
