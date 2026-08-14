import 'server-only';

import { notFound } from 'next/navigation';

import { getMediaComputedData } from '@/domains/media/services/media-data';
import { TMDB_IMG } from '@/shared/constants';

const SKELETON_PREVIEW_DELAY_MS = 2500;

/** Development-only route fallback preview. Use ?skeleton=1 on a media detail URL. */
export async function delayMediaSkeletonPreview(searchParams) {
  if (process.env.NODE_ENV !== 'development') {
    return;
  }

  const resolvedSearchParams = (await searchParams) || {};
  const previewValue = Array.isArray(resolvedSearchParams.skeleton)
    ? resolvedSearchParams.skeleton[0]
    : resolvedSearchParams.skeleton;

  if (previewValue !== '1') {
    return;
  }

  await new Promise((resolve) => setTimeout(resolve, SKELETON_PREVIEW_DELAY_MS));
}

export function getMediaTitle(media = {}) {
  return media?.title || media?.original_title || media?.name || media?.original_name || 'Untitled';
}

function getMediaYear(media = {}) {
  const value = media?.release_date || media?.first_air_date;
  return typeof value === 'string' && value.length >= 4 ? value.slice(0, 4) : null;
}

function createMetadataDescription(value, fallback) {
  const description = String(value || fallback || '').trim();
  if (description.length <= 150) return description;
  return description.slice(0, 150).replace(/\s+\S*$/, '');
}

function createImageUrl(filePath, size) {
  return filePath ? `${TMDB_IMG}/${size}${filePath}` : undefined;
}

function isMissingMedia(media, response, isDisplayable) {
  return !media || response?.status === 404 || !isDisplayable(media, 'detail');
}

export async function loadMediaRouteData(params, getBase) {
  const { id } = await params;
  const response = await getBase(id);

  return {
    id,
    media: response?.data || null,
    response,
  };
}

export function createMediaMetadata({
  description,
  imageHeight = 720,
  imagePath,
  imageSize = 'w1280',
  imageWidth = 1280,
  openGraphType,
  title,
  fallbackDescription,
  fallbackTitle,
}) {
  if (!title) return { title: fallbackTitle };

  const resolvedDescription = createMetadataDescription(description, fallbackDescription);
  const imageUrl = createImageUrl(imagePath, imageSize);

  return {
    title,
    description: resolvedDescription,
    openGraph: {
      title,
      description: resolvedDescription,
      type: openGraphType,
      images: imageUrl ? [{ url: imageUrl, width: imageWidth, height: imageHeight }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: resolvedDescription,
      images: imageUrl ? [imageUrl] : [],
    },
  };
}

function createTitleDetailMetadata(media, { fallbackTitle, openGraphType }) {
  const titleText = getMediaTitle(media);
  const year = getMediaYear(media);
  const title = `${titleText}${year ? ` (${year})` : ''} - Tvizzie`;

  return createMediaMetadata({
    description: media?.overview,
    fallbackDescription: `Details for ${titleText}`,
    fallbackTitle,
    imagePath: media?.backdrop_path,
    openGraphType,
    title,
  });
}

function createTitleReviewsMetadata(media, { fallbackTitle }) {
  const titleText = getMediaTitle(media);
  const year = getMediaYear(media);
  const title = `${titleText}${year ? ` (${year})` : ''} Reviews - Tvizzie`;

  return createMediaMetadata({
    description: `Read all reviews for ${titleText}.`,
    fallbackTitle,
    imagePath: media?.backdrop_path,
    openGraphType: 'website',
    title,
  });
}

export function createTitleDetailRoute({
  Client,
  fallbackTitle,
  getBase,
  getSecondary,
  isDisplayable,
  mediaType,
  openGraphType,
}) {
  return {
    async generateMetadata({ params }) {
      const { media, response } = await loadMediaRouteData(params, getBase);
      if (isMissingMedia(media, response, isDisplayable)) return { title: fallbackTitle };
      return createTitleDetailMetadata(media, { fallbackTitle, openGraphType });
    },
    async Page({ params, searchParams }) {
      await delayMediaSkeletonPreview(searchParams);
      const { id, media, response } = await loadMediaRouteData(params, getBase);
      if (isMissingMedia(media, response, isDisplayable)) notFound();

      const secondaryDataPromise = getSecondary(id).then(
        (secondaryResponse) => secondaryResponse?.data || {},
      );

      return (
        <Client
          key={`${mediaType}-${media.id}`}
          computed={getMediaComputedData(media)}
          mediaType={mediaType}
          movie={media}
          secondaryDataPromise={secondaryDataPromise}
        />
      );
    },
  };
}

export function createTitleReviewsRoute({
  Client,
  fallbackTitle,
  getBase,
  getSecondary,
  isDisplayable,
  mediaType,
}) {
  return {
    async generateMetadata({ params }) {
      const { media, response } = await loadMediaRouteData(params, getBase);
      if (isMissingMedia(media, response, isDisplayable)) return { title: fallbackTitle };
      return createTitleReviewsMetadata(media, { fallbackTitle });
    },
    async Page({ params }) {
      const { media, response } = await loadMediaRouteData(params, getBase);
      if (isMissingMedia(media, response, isDisplayable)) notFound();

      const secondaryDataPromise = getSecondary
        ? getSecondary(media.id).then((secondaryResponse) => secondaryResponse?.data || {})
        : null;

      return (
        <Client
          computed={getMediaComputedData(media)}
          mediaType={mediaType}
          movie={media}
          secondaryDataPromise={secondaryDataPromise}
        />
      );
    },
  };
}
