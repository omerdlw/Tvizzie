import 'server-only';

import { createListReviewLikeKey } from './server.shared.js';

function buildLikesMap(rows = []) {
  const map = new Map();

  rows.forEach((row) => {
    const key = `${row.media_key}:${row.review_user_id}`;
    const current = map.get(key) || [];

    current.push(row.user_id);
    map.set(key, current);
  });

  return map;
}

export async function fetchReviewLikes(admin, mediaKeys = []) {
  if (!Array.isArray(mediaKeys) || mediaKeys.length === 0) {
    return new Map();
  }

  const uniqueKeys = [...new Set(mediaKeys.filter(Boolean))];
  const likesRows = [];

  for (let index = 0; index < uniqueKeys.length; index += 100) {
    const chunk = uniqueKeys.slice(index, index + 100);
    const result = await admin.from('review_likes').select('media_key, review_user_id, user_id').in('media_key', chunk);

    if (result.error) {
      throw new Error(result.error.message || 'Review likes could not be loaded');
    }

    likesRows.push(...(result.data || []));
  }

  return buildLikesMap(likesRows);
}

export async function loadListSubjectMap(admin, listIds = []) {
  const uniqueListIds = [...new Set(listIds.filter(Boolean))];

  if (uniqueListIds.length === 0) {
    return new Map();
  }

  const listsResult = await admin
    .from('lists')
    .select('id,user_id,slug,title,poster_path,payload')
    .in('id', uniqueListIds);

  if (listsResult.error) {
    throw new Error(listsResult.error.message || 'List context could not be loaded');
  }

  const listRows = listsResult.data || [];
  const ownerIds = [...new Set(listRows.map((row) => row.user_id).filter(Boolean))];
  const ownerMap = new Map();

  if (ownerIds.length > 0) {
    const ownerResult = await admin.from('profiles').select('id,username').in('id', ownerIds);

    if (ownerResult.error) {
      throw new Error(ownerResult.error.message || 'List owners could not be loaded');
    }

    (ownerResult.data || []).forEach((owner) => {
      ownerMap.set(owner.id, owner.username || owner.id);
    });
  }

  const listMap = new Map();

  listRows.forEach((row) => {
    const payload = row.payload && typeof row.payload === 'object' ? row.payload : {};
    const ownerUsername = payload?.ownerSnapshot?.username || ownerMap.get(row.user_id) || row.user_id;
    const slug = row.slug || row.id;

    listMap.set(row.id, {
      subjectHref: `/account/${ownerUsername}/lists/${slug}`,
      subjectId: row.id,
      subjectKey: createListReviewLikeKey(row.user_id, row.id),
      subjectOwnerId: row.user_id,
      subjectOwnerUsername: ownerUsername,
      subjectPreviewItems: Array.isArray(payload.previewItems) ? payload.previewItems : [],
      subjectPoster: row.poster_path || payload.coverUrl || null,
      subjectSlug: slug,
      subjectTitle: row.title || 'Untitled List',
      subjectType: 'list',
    });
  });

  return listMap;
}
