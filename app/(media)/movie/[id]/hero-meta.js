'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';

const FIT_BUFFER_PX = 12;

function areSameItems(first = [], second = []) {
  if (first.length !== second.length) {
    return false;
  }

  return first.every((item, index) => item === second[index]);
}

function fitItemsToWidth(items = [], itemRefs, separatorWidth, availableWidth) {
  if (!items.length || !Number.isFinite(availableWidth) || availableWidth <= 0) {
    return [];
  }

  let occupiedWidth = 0;
  const visibleItems = [];

  items.forEach((item) => {
    const itemWidth = itemRefs.current.get(item)?.offsetWidth || 0;
    const nextWidth = visibleItems.length > 0 ? occupiedWidth + separatorWidth + itemWidth : occupiedWidth + itemWidth;

    if (visibleItems.length === 0 || nextWidth <= Math.max(0, availableWidth - FIT_BUFFER_PX)) {
      visibleItems.push(item);
      occupiedWidth = nextWidth;
    }
  });

  return visibleItems;
}

function MetaLine({ items = [], lineRef = null, muted = false }) {
  if (!items.length) {
    return null;
  }

  return (
    <p
      ref={lineRef}
      className={`max-w-full overflow-hidden text-[12px] font-semibold tracking-[0.2em] whitespace-nowrap text-black/70 uppercase sm:text-[13px]`}
    >
      {items.map((item, index) => (
        <span key={`${item}-${index}`}>
          {index > 0 ? <span className="px-2 text-black/50">/</span> : null}
          <span>{item}</span>
        </span>
      ))}
    </p>
  );
}

export default function HeroMeta({ genres = [], tags = [] }) {
  const wrapperRef = useRef(null);
  const genreLineRef = useRef(null);
  const tagLineRef = useRef(null);
  const separatorRef = useRef(null);
  const genreItemRefs = useRef(new Map());
  const tagItemRefs = useRef(new Map());
  const [visibleGenres, setVisibleGenres] = useState(genres);
  const [visibleTags, setVisibleTags] = useState(tags.map((tag) => `#${tag}`));

  useEffect(() => {
    const element = wrapperRef.current;

    if (!element) {
      return;
    }

    let frameId = 0;

    const measure = () => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => {
        const availableWidth = element.clientWidth;
        const separatorWidth = separatorRef.current?.offsetWidth || 0;
        const nextVisibleGenres = fitItemsToWidth(genres, genreItemRefs, separatorWidth, availableWidth);
        const formattedTags = tags.map((tag) => `#${tag}`);
        const nextVisibleTags = fitItemsToWidth(formattedTags, tagItemRefs, separatorWidth, availableWidth);

        setVisibleGenres((currentValue) =>
          areSameItems(currentValue, nextVisibleGenres) ? currentValue : nextVisibleGenres
        );
        setVisibleTags((currentValue) =>
          areSameItems(currentValue, nextVisibleTags) ? currentValue : nextVisibleTags
        );
      });
    };

    measure();

    const observer = new ResizeObserver(() => {
      measure();
    });

    observer.observe(element);

    if (document?.fonts?.ready) {
      document.fonts.ready.then(() => {
        measure();
      });
    }

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
    };
  }, [genres, tags]);

  useLayoutEffect(() => {
    const genreLine = genreLineRef.current;

    if (genreLine && genreLine.scrollWidth > genreLine.clientWidth && visibleGenres.length > 1) {
      setVisibleGenres((currentValue) => currentValue.slice(0, -1));
    }
  }, [visibleGenres]);

  useLayoutEffect(() => {
    const tagLine = tagLineRef.current;

    if (tagLine && tagLine.scrollWidth > tagLine.clientWidth && visibleTags.length > 1) {
      setVisibleTags((currentValue) => currentValue.slice(0, -1));
    }
  }, [visibleTags]);

  return (
    <div ref={wrapperRef} className="mt-4 flex w-full max-w-[70ch] flex-col gap-2 overflow-hidden">
      <MetaLine items={visibleGenres} lineRef={genreLineRef} />
      <MetaLine items={visibleTags} lineRef={tagLineRef} muted />

      <div className="pointer-events-none absolute top-0 -left-[9999px] opacity-0" aria-hidden="true">
        <span ref={separatorRef} className="px-2 text-[12px] font-semibold tracking-widest uppercase sm:text-[13px]">
          /
        </span>

        <div className="flex flex-col gap-2">
          <div>
            {genres.map((genre) => (
              <span
                key={genre}
                ref={(node) => {
                  if (node) {
                    genreItemRefs.current.set(genre, node);
                    return;
                  }

                  genreItemRefs.current.delete(genre);
                }}
                className="text-[12px] font-semibold tracking-[0.2em] uppercase sm:text-[13px]"
              >
                {genre}
              </span>
            ))}
          </div>

          <div>
            {tags.map((tag) => {
              const formattedTag = `#${tag}`;

              return (
                <span
                  key={formattedTag}
                  ref={(node) => {
                    if (node) {
                      tagItemRefs.current.set(formattedTag, node);
                      return;
                    }

                    tagItemRefs.current.delete(formattedTag);
                  }}
                  className="text-[12px] font-semibold tracking-[0.2em] uppercase sm:text-[13px]"
                >
                  {formattedTag}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
