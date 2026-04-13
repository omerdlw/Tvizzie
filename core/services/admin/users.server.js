import 'server-only';

import { createAdminClient } from '@/core/clients/supabase/admin';
import { resolveProviderIds } from '@/core/auth/capabilities';
import { invokeSessionControl } from '@/core/auth/servers/session/revocation.server';
import { createAdminPayload } from './response.server';

const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 24;
const USERNAME_PATTERN = /^[a-z0-9]+(?:[_-][a-z0-9]+)*$/;
const USER_LIST_DEFAULT_PAGE_SIZE = 20;
const USER_LIST_MAX_PAGE_SIZE = 100;
const USER_SEARCH_SCAN_MAX_PAGES = 20;

function normalizeValue(value) {
  return String(value || '').trim();
}

function normalizeLowerValue(value) {
  return normalizeValue(value).toLowerCase();
}

function normalizeSearchText(value) {
  const normalized = normalizeLowerValue(value);

  if (!normalized) {
    return '';
  }

  return normalized
    .replace(/[ıİ]/g, 'i')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function normalizeEmail(value) {
  return normalizeLowerValue(value);
}

function normalizeProviderFilter(value) {
  const provider = normalizeLowerValue(value);

  if (!provider || provider === 'all') {
    return '';
  }

  if (provider === 'google' || provider === 'google.com') {
    return 'google.com';
  }

  if (provider === 'email' || provider === 'password') {
    return 'password';
  }

  return provider;
}

function normalizeDateRangeDays(value) {
  const days = normalizeInteger(value, 0);

  if (days <= 0) {
    return null;
  }

  return Math.min(days, 3650);
}

function normalizeInteger(value, fallback = 0) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.floor(parsed);
}

function toArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (value === null || value === undefined || value === '') {
    return [];
  }

  return [value];
}

function maskEmail(email) {
  const normalized = normalizeEmail(email);

  if (!normalized.includes('@')) {
    return normalized || null;
  }

  const [local, domain] = normalized.split('@');

  if (!local) {
    return normalized;
  }

  if (local.length <= 2) {
    return `${local[0] || '*'}*@${domain}`;
  }

  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

function isJsonObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function normalizeRoleList(values = []) {
  return [...new Set(values.map((value) => normalizeLowerValue(value)).filter(Boolean))];
}

function sanitizeUsernameCandidate(value) {
  const turkishMap = {
    ç: 'c',
    ğ: 'g',
    ı: 'i',
    ö: 'o',
    ş: 's',
    ü: 'u',
  };

  return normalizeValue(value)
    .toLowerCase()
    .replace(/[çğışüö]/g, (char) => turkishMap[char] || char)
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_{2,}/g, '_');
}

function validateUsername(value) {
  const normalized = sanitizeUsernameCandidate(value);

  if (!normalized) {
    return null;
  }

  if (normalized.length < USERNAME_MIN_LENGTH || normalized.length > USERNAME_MAX_LENGTH) {
    throw new Error(`Username must be ${USERNAME_MIN_LENGTH}-${USERNAME_MAX_LENGTH} characters`);
  }

  if (!USERNAME_PATTERN.test(normalized)) {
    throw new Error('Username can only contain lowercase letters, numbers, _ and -');
  }

  return normalized;
}

function buildSearchNeedle(user = {}) {
  const identities = Array.isArray(user?.identities) ? user.identities : [];
  const metadata = isJsonObject(user?.user_metadata) ? user.user_metadata : {};

  return [
    normalizeSearchText(user?.id),
    normalizeSearchText(user?.email),
    normalizeSearchText(user?.phone),
    normalizeSearchText(metadata?.username),
    normalizeSearchText(metadata?.name),
    normalizeSearchText(metadata?.display_name),
    ...identities.map((identity) => normalizeSearchText(identity?.identity_data?.email || identity?.email)),
  ]
    .filter(Boolean)
    .join(' ');
}

function matchesUserSearch(user, searchTerm) {
  const normalizedSearch = normalizeSearchText(searchTerm);

  if (!normalizedSearch) {
    return true;
  }

  const tokens = normalizedSearch.split(/\s+/).filter(Boolean);

  if (tokens.length === 0) {
    return true;
  }

  const needle = buildSearchNeedle(user);

  return tokens.every((token) => needle.includes(token));
}

function formatTimestamp(value) {
  const normalized = normalizeValue(value);
  return normalized || null;
}

function resolveAuthRoles(user = {}) {
  const appMetadata = isJsonObject(user?.app_metadata) ? user.app_metadata : {};

  return normalizeRoleList([...toArray(appMetadata?.role), ...toArray(appMetadata?.roles)]);
}

function resolveAuthPrimaryRole(user = {}) {
  const roles = resolveAuthRoles(user);
  return roles[0] || null;
}

function resolveAuthProviders(user = {}) {
  return resolveProviderIds({
    appMetadata: isJsonObject(user?.app_metadata) ? user.app_metadata : {},
    identities: Array.isArray(user?.identities) ? user.identities : [],
    providerData: [],
    tokenClaims: {},
  });
}

function matchesProviderFilter(user, providerFilter) {
  if (!providerFilter) {
    return true;
  }

  const providers = resolveAuthProviders(user);
  return providers.includes(providerFilter);
}

function matchesDateRangeFilter(user, dateRangeDays) {
  if (!dateRangeDays) {
    return true;
  }

  const createdAt = Date.parse(normalizeValue(user?.created_at));

  if (!Number.isFinite(createdAt)) {
    return true;
  }

  const threshold = Date.now() - dateRangeDays * 24 * 60 * 60 * 1000;
  return createdAt >= threshold;
}

function applyAuthUserFilters(users = [], { providerFilter = '', dateRangeDays = null } = {}) {
  return users.filter((user) => matchesProviderFilter(user, providerFilter) && matchesDateRangeFilter(user, dateRangeDays));
}

function mapAuthUserSummary(user = {}) {
  return {
    appMetadata: isJsonObject(user?.app_metadata) ? user.app_metadata : {},
    createdAt: formatTimestamp(user?.created_at),
    disabled: Boolean(user?.banned_until),
    email: normalizeEmail(user?.email) || null,
    emailConfirmed: Boolean(user?.email_confirmed_at || user?.confirmed_at),
    id: normalizeValue(user?.id) || null,
    identities: Array.isArray(user?.identities) ? user.identities : [],
    lastSignInAt: formatTimestamp(user?.last_sign_in_at),
    maskedEmail: maskEmail(user?.email),
    primaryRole: resolveAuthPrimaryRole(user),
    providers: resolveAuthProviders(user),
    roles: resolveAuthRoles(user),
    userMetadata: isJsonObject(user?.user_metadata) ? user.user_metadata : {},
  };
}

async function safeLoad(source, loader) {
  try {
    return {
      data: await loader(),
      error: null,
      source,
    };
  } catch (error) {
    return {
      data: null,
      error: {
        code: 'ADMIN_SOURCE_ERROR',
        message: normalizeValue(error?.message) || `${source} could not be loaded`,
        source,
      },
      source,
    };
  }
}

async function listUsersPage(admin, { page = 1, pageSize = USER_LIST_DEFAULT_PAGE_SIZE } = {}) {
  const result = await admin.auth.admin.listUsers({
    page,
    perPage: pageSize,
  });

  if (result.error) {
    throw new Error(result.error.message || 'Auth users could not be loaded');
  }

  const users = Array.isArray(result.data?.users) ? result.data.users : [];
  const total = normalizeInteger(result.data?.total, 0);
  const lastPage = normalizeInteger(result.data?.lastPage, 0);
  const nextPage = normalizeInteger(result.data?.nextPage, 0);

  return {
    users,
    pagination: {
      lastPage: lastPage > 0 ? lastPage : null,
      nextPage: nextPage > 0 ? nextPage : null,
      total,
    },
  };
}

async function scanUsersForSearch(admin, searchTerm) {
  const collected = [];
  let currentPage = 1;
  let reachedEnd = false;
  let total = 0;

  while (!reachedEnd && currentPage <= USER_SEARCH_SCAN_MAX_PAGES) {
    const pageData = await listUsersPage(admin, {
      page: currentPage,
      pageSize: USER_LIST_MAX_PAGE_SIZE,
    });
    const users = pageData.users || [];
    total = Math.max(total, normalizeInteger(pageData.pagination?.total, 0));
    collected.push(...users);

    if (users.length < USER_LIST_MAX_PAGE_SIZE || !pageData.pagination?.nextPage) {
      reachedEnd = true;
      break;
    }

    currentPage += 1;
  }

  const filtered = collected.filter((user) => matchesUserSearch(user, searchTerm));

  return {
    filtered,
    scannedCount: collected.length,
    total,
  };
}

async function loadMapByIds(admin, table, idColumn, ids = [], selectColumns = '*') {
  const uniqueIds = [...new Set(ids.map((value) => normalizeValue(value)).filter(Boolean))];

  if (uniqueIds.length === 0) {
    return new Map();
  }

  const result = await admin.from(table).select(selectColumns).in(idColumn, uniqueIds);

  if (result.error) {
    throw new Error(result.error.message || `${table} could not be loaded`);
  }

  return new Map((result.data || []).map((row) => [normalizeValue(row?.[idColumn]), row]));
}

function mapListItem({
  user,
  profile,
  lifecycle,
  counters,
}) {
  const authUser = mapAuthUserSummary(user);

  return {
    auth: {
      createdAt: authUser.createdAt,
      disabled: authUser.disabled,
      email: authUser.email,
      emailConfirmed: authUser.emailConfirmed,
      lastSignInAt: authUser.lastSignInAt,
      primaryRole: authUser.primaryRole,
      providers: authUser.providers,
      roles: authUser.roles,
    },
    counters: {
      followers: normalizeInteger(counters?.follower_count, 0),
      following: normalizeInteger(counters?.following_count, 0),
      likes: normalizeInteger(counters?.likes_count, 0),
      lists: normalizeInteger(counters?.lists_count, 0),
      watched: normalizeInteger(counters?.watched_count, 0),
      watchlist: normalizeInteger(counters?.watchlist_count, 0),
    },
    id: authUser.id,
    lifecycle: lifecycle
      ? {
          deletedAt: formatTimestamp(lifecycle?.deleted_at),
          pendingOperationKey: normalizeValue(lifecycle?.pending_operation_key) || null,
          state: normalizeValue(lifecycle?.state) || 'ACTIVE',
          stateReason: normalizeValue(lifecycle?.state_reason) || null,
        }
      : null,
    profile: profile
      ? {
          displayName: normalizeValue(profile?.display_name) || 'Anonymous User',
          isPrivate: profile?.is_private === true,
          updatedAt: formatTimestamp(profile?.updated_at),
          username: normalizeValue(profile?.username) || null,
        }
      : null,
  };
}

function resolveListWidgets(items = []) {
  const totalUsers = items.length;
  const disabledUsers = items.filter((item) => item?.auth?.disabled).length;
  const passwordUsers = items.filter((item) => (item?.auth?.providers || []).includes('password')).length;
  const googleUsers = items.filter((item) => (item?.auth?.providers || []).includes('google.com')).length;

  return [
    {
      description: 'Users shown in current page',
      id: 'users-page-count',
      source: 'auth',
      status: 'healthy',
      title: 'Visible Users',
      value: totalUsers,
    },
    {
      description: 'Users currently banned/disabled',
      id: 'users-disabled-count',
      source: 'auth',
      status: disabledUsers > 0 ? 'degraded' : 'healthy',
      title: 'Disabled Users',
      value: disabledUsers,
    },
    {
      description: 'Users with password sign-in enabled',
      id: 'users-password-enabled',
      source: 'auth',
      status: 'healthy',
      title: 'Password Login',
      value: passwordUsers,
    },
    {
      description: 'Users with Google provider linked',
      id: 'users-google-enabled',
      source: 'auth',
      status: 'healthy',
      title: 'Google Login',
      value: googleUsers,
    },
  ];
}

function resolveUsersPagination({
  page = 1,
  pageSize = USER_LIST_DEFAULT_PAGE_SIZE,
  items = [],
  total = 0,
  hasMore = false,
  searchApplied = false,
}) {
  const normalizedPage = Math.max(1, normalizeInteger(page, 1));
  const normalizedPageSize = Math.max(1, Math.min(USER_LIST_MAX_PAGE_SIZE, normalizeInteger(pageSize, USER_LIST_DEFAULT_PAGE_SIZE)));
  const normalizedTotal = Math.max(0, normalizeInteger(total, 0));
  const resolvedTotal = searchApplied ? Math.max(normalizedTotal, items.length) : normalizedTotal;
  const totalPages =
    resolvedTotal > 0 ? Math.max(1, Math.ceil(resolvedTotal / normalizedPageSize)) : hasMore ? normalizedPage + 1 : normalizedPage;

  return {
    hasMore: Boolean(hasMore),
    page: normalizedPage,
    pageSize: normalizedPageSize,
    total: resolvedTotal,
    totalPages,
  };
}

async function countByColumn(admin, table, column, value) {
  const result = await admin.from(table).select('*', {
    count: 'exact',
    head: true,
  }).eq(column, value);

  if (result.error) {
    throw new Error(result.error.message || `${table} count failed`);
  }

  return normalizeInteger(result.count, 0);
}

async function fetchRecentRowsByColumn(admin, {
  table,
  column,
  value,
  limit = 20,
  orderColumns = ['updated_at', 'created_at', 'added_at'],
} = {}) {
  const normalizedLimit = Math.max(1, Math.min(200, normalizeInteger(limit, 20)));

  for (const orderColumn of [...orderColumns, null]) {
    let query = admin.from(table).select('*').eq(column, value).limit(normalizedLimit);

    if (orderColumn) {
      query = query.order(orderColumn, {
        ascending: false,
      });
    }

    const result = await query;

    if (!result.error) {
      return result.data || [];
    }
  }

  throw new Error(`${table} rows could not be loaded`);
}

function normalizeAdminUsersQuery({
  page = 1,
  pageSize = USER_LIST_DEFAULT_PAGE_SIZE,
  searchTerm = '',
  providerFilter = '',
  dateRangeDays = null,
} = {}) {
  const normalizedPage = Math.max(1, normalizeInteger(page, 1));
  const normalizedPageSize = Math.max(
    1,
    Math.min(USER_LIST_MAX_PAGE_SIZE, normalizeInteger(pageSize, USER_LIST_DEFAULT_PAGE_SIZE))
  );

  return {
    dateRangeDays: normalizeDateRangeDays(dateRangeDays),
    page: normalizedPage,
    pageSize: normalizedPageSize,
    providerFilter: normalizeProviderFilter(providerFilter),
    searchTerm: normalizeValue(searchTerm),
  };
}

function mapDetailUser(user) {
  const mapped = mapAuthUserSummary(user);

  return {
    appMetadata: mapped.appMetadata,
    createdAt: mapped.createdAt,
    disabled: mapped.disabled,
    email: mapped.email,
    emailConfirmed: mapped.emailConfirmed,
    id: mapped.id,
    identities: mapped.identities,
    lastSignInAt: mapped.lastSignInAt,
    maskedEmail: mapped.maskedEmail,
    providers: mapped.providers,
    roles: mapped.roles,
    userMetadata: mapped.userMetadata,
  };
}

function mapObject(value, fallback = {}) {
  return isJsonObject(value) ? value : fallback;
}

function buildUpdateAuthPayload(currentUser, input = {}) {
  const updates = {};
  const appMetadata = mapObject(currentUser?.app_metadata, {});
  const userMetadata = mapObject(currentUser?.user_metadata, {});

  if (input.email !== undefined) {
    const normalizedEmail = normalizeEmail(input.email);

    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      throw new Error('Valid email is required');
    }

    updates.email = normalizedEmail;
  }

  if (input.password !== undefined) {
    const normalizedPassword = normalizeValue(input.password);

    if (normalizedPassword && normalizedPassword.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    if (normalizedPassword) {
      updates.password = normalizedPassword;
    }
  }

  if (input.emailConfirmed !== undefined) {
    updates.email_confirm = Boolean(input.emailConfirmed);
  }

  if (input.userMetadata !== undefined) {
    if (!isJsonObject(input.userMetadata)) {
      throw new Error('userMetadata must be a JSON object');
    }

    updates.user_metadata = input.userMetadata;
  }

  if (input.appMetadata !== undefined) {
    if (!isJsonObject(input.appMetadata)) {
      throw new Error('appMetadata must be a JSON object');
    }

    updates.app_metadata = input.appMetadata;
  }

  if (input.role !== undefined) {
    const normalizedRole = normalizeLowerValue(input.role);

    if (!normalizedRole) {
      throw new Error('role cannot be empty');
    }

    const nextAppMetadata = mapObject(updates.app_metadata, appMetadata);
    const existingRoles = normalizeRoleList([...toArray(nextAppMetadata?.roles), ...toArray(nextAppMetadata?.role)]);

    updates.app_metadata = {
      ...nextAppMetadata,
      role: normalizedRole,
      roles: normalizeRoleList([normalizedRole, ...existingRoles]),
    };
  }

  if (input.signInMode !== undefined) {
    const normalizedMode = normalizeLowerValue(input.signInMode);
    const nextAppMetadata = mapObject(updates.app_metadata, appMetadata);
    const currentProviders = resolveProviderIds({
      appMetadata: nextAppMetadata,
      identities: Array.isArray(currentUser?.identities) ? currentUser.identities : [],
      providerData: [],
      tokenClaims: {},
    });
    const providerSet = new Set(currentProviders);

    if (normalizedMode === 'password') {
      providerSet.add('password');

      updates.app_metadata = {
        ...nextAppMetadata,
        provider: 'email',
        providers: [...providerSet],
        primary_provider: 'password',
        tvz_password_enabled: true,
      };
    } else if (normalizedMode === 'google') {
      updates.app_metadata = {
        ...nextAppMetadata,
        provider: 'google',
        providers: [...providerSet].filter((provider) => provider !== 'password'),
        primary_provider: 'google.com',
        tvz_password_enabled: false,
      };
    } else if (normalizedMode === 'hybrid') {
      providerSet.add('password');
      providerSet.add('google.com');

      updates.app_metadata = {
        ...nextAppMetadata,
        providers: [...providerSet],
        primary_provider: 'password',
        tvz_password_enabled: true,
      };
    } else {
      throw new Error('signInMode must be one of: password, google, hybrid');
    }
  }

  if (input.banDurationHours !== undefined) {
    const banHours = Math.max(0, normalizeInteger(input.banDurationHours, 0));
    updates.ban_duration = banHours > 0 ? `${banHours}h` : 'none';
  }

  if (input.unban === true) {
    updates.ban_duration = 'none';
  }

  if (Object.keys(updates).length === 0) {
    throw new Error('No auth fields provided for update');
  }

  if (updates.user_metadata === undefined && input.mergeUserMetadata === true) {
    updates.user_metadata = {
      ...userMetadata,
    };
  }

  return updates;
}

async function updateUsernameMapping(admin, {
  userId,
  previousUsername = null,
  nextUsername = null,
} = {}) {
  const normalizedPrevious = validateUsername(previousUsername);
  const normalizedNext = validateUsername(nextUsername);

  if (!normalizedNext || normalizedNext === normalizedPrevious) {
    return;
  }

  const conflictResult = await admin
    .from('usernames')
    .select('user_id')
    .eq('username_lower', normalizedNext)
    .maybeSingle();

  if (conflictResult.error) {
    throw new Error(conflictResult.error.message || 'Username conflict check failed');
  }

  const existingOwnerId = normalizeValue(conflictResult.data?.user_id);

  if (existingOwnerId && existingOwnerId !== normalizeValue(userId)) {
    throw new Error('Username is already in use');
  }

  const deleteExisting = await admin.from('usernames').delete().eq('user_id', userId);

  if (deleteExisting.error) {
    throw new Error(deleteExisting.error.message || 'Username mapping cleanup failed');
  }

  const insertResult = await admin.from('usernames').insert({
    user_id: userId,
    username: normalizedNext,
    username_lower: normalizedNext,
  });

  if (insertResult.error) {
    throw new Error(insertResult.error.message || 'Username mapping update failed');
  }
}

async function updateProfile(admin, userId, input = {}) {
  const profileResult = await admin.from('profiles').select('*').eq('id', userId).maybeSingle();

  if (profileResult.error) {
    throw new Error(profileResult.error.message || 'Profile could not be loaded');
  }

  const existingProfile = profileResult.data || null;
  const updates = {};

  if (input.displayName !== undefined) {
    const normalizedDisplayName = normalizeValue(input.displayName) || 'Anonymous User';
    updates.display_name = normalizedDisplayName;
    updates.display_name_lower = normalizeLowerValue(normalizedDisplayName);
  }

  if (input.description !== undefined) {
    updates.description = normalizeValue(input.description) || '';
  }

  if (input.avatarUrl !== undefined) {
    updates.avatar_url = normalizeValue(input.avatarUrl) || null;
  }

  if (input.bannerUrl !== undefined) {
    updates.banner_url = normalizeValue(input.bannerUrl) || null;
  }

  if (input.email !== undefined) {
    const normalizedEmail = normalizeEmail(input.email);
    updates.email = normalizedEmail || null;
  }

  if (input.isPrivate !== undefined) {
    updates.is_private = Boolean(input.isPrivate);
  }

  if (input.username !== undefined) {
    const normalizedUsername = validateUsername(input.username);

    if (!normalizedUsername) {
      throw new Error('Username is required');
    }

    updates.username = normalizedUsername;
    updates.username_lower = normalizedUsername;
  }

  if (Object.keys(updates).length === 0) {
    throw new Error('No profile fields provided for update');
  }

  if (existingProfile) {
    const updateResult = await admin.from('profiles').update(updates).eq('id', userId).select('*').maybeSingle();

    if (updateResult.error) {
      throw new Error(updateResult.error.message || 'Profile update failed');
    }

    if (updates.username !== undefined) {
      await updateUsernameMapping(admin, {
        nextUsername: updates.username,
        previousUsername: existingProfile?.username || null,
        userId,
      });
    }

    return updateResult.data || existingProfile;
  }

  const insertPayload = {
    avatar_url: updates.avatar_url ?? null,
    banner_url: updates.banner_url ?? null,
    description: updates.description ?? '',
    display_name: updates.display_name || 'Anonymous User',
    display_name_lower: updates.display_name_lower || normalizeLowerValue(updates.display_name || 'Anonymous User'),
    email: updates.email ?? null,
    id: userId,
    is_private: updates.is_private ?? false,
    username: updates.username || null,
    username_lower: updates.username_lower || null,
  };
  const insertResult = await admin.from('profiles').insert(insertPayload).select('*').maybeSingle();

  if (insertResult.error) {
    throw new Error(insertResult.error.message || 'Profile insert failed');
  }

  if (insertPayload.username) {
    await updateUsernameMapping(admin, {
      nextUsername: insertPayload.username,
      previousUsername: null,
      userId,
    });
  }

  return insertResult.data || insertPayload;
}

function resolveContentUpdatePayload(contentType, input = {}) {
  if (contentType === 'list') {
    const updates = {};

    if (input.title !== undefined) {
      const normalizedTitle = normalizeValue(input.title);

      if (!normalizedTitle) {
        throw new Error('List title cannot be empty');
      }

      updates.title = normalizedTitle;
    }

    if (input.description !== undefined) {
      updates.description = normalizeValue(input.description) || '';
    }

    if (input.slug !== undefined) {
      updates.slug = normalizeValue(input.slug) || null;
    }

    if (input.isPrivate !== undefined) {
      updates.is_private = Boolean(input.isPrivate);
    }

    return updates;
  }

  if (contentType === 'media_review' || contentType === 'list_review') {
    const updates = {};

    if (input.content !== undefined) {
      updates.content = normalizeValue(input.content) || '';
    }

    if (input.rating !== undefined) {
      const normalizedRating = Number(input.rating);

      if (!Number.isFinite(normalizedRating) || normalizedRating < 0 || normalizedRating > 10) {
        throw new Error('Rating must be between 0 and 10');
      }

      updates.rating = normalizedRating;
    }

    if (input.isSpoiler !== undefined) {
      updates.is_spoiler = Boolean(input.isSpoiler);
    }

    return updates;
  }

  throw new Error('Unsupported contentType');
}

async function updateContent(admin, userId, input = {}) {
  const contentType = normalizeLowerValue(input.contentType);

  if (!contentType) {
    throw new Error('contentType is required');
  }

  const updates = resolveContentUpdatePayload(contentType, input);

  if (Object.keys(updates).length === 0) {
    throw new Error('No content fields provided for update');
  }

  if (contentType === 'list') {
    const listId = normalizeValue(input.listId);

    if (!listId) {
      throw new Error('listId is required');
    }

    const result = await admin.from('lists').update(updates).eq('user_id', userId).eq('id', listId).select('*').maybeSingle();

    if (result.error) {
      throw new Error(result.error.message || 'List update failed');
    }

    return {
      contentType,
      identifier: {
        listId,
      },
      row: result.data || null,
    };
  }

  if (contentType === 'media_review') {
    const mediaKey = normalizeValue(input.mediaKey);

    if (!mediaKey) {
      throw new Error('mediaKey is required');
    }

    const result = await admin
      .from('media_reviews')
      .update(updates)
      .eq('user_id', userId)
      .eq('media_key', mediaKey)
      .select('*')
      .maybeSingle();

    if (result.error) {
      throw new Error(result.error.message || 'Media review update failed');
    }

    return {
      contentType,
      identifier: {
        mediaKey,
      },
      row: result.data || null,
    };
  }

  const listId = normalizeValue(input.listId);

  if (!listId) {
    throw new Error('listId is required');
  }

  const result = await admin
    .from('list_reviews')
    .update(updates)
    .eq('user_id', userId)
    .eq('list_id', listId)
    .select('*')
    .maybeSingle();

  if (result.error) {
    throw new Error(result.error.message || 'List review update failed');
  }

  return {
    contentType,
    identifier: {
      listId,
    },
    row: result.data || null,
  };
}

async function deleteContent(admin, userId, input = {}) {
  const contentType = normalizeLowerValue(input.contentType);

  if (!contentType) {
    throw new Error('contentType is required');
  }

  if (contentType === 'list') {
    const listId = normalizeValue(input.listId);

    if (!listId) {
      throw new Error('listId is required');
    }

    const result = await admin.from('lists').delete().eq('user_id', userId).eq('id', listId);

    if (result.error) {
      throw new Error(result.error.message || 'List delete failed');
    }

    return {
      contentType,
      identifier: {
        listId,
      },
    };
  }

  if (contentType === 'media_review') {
    const mediaKey = normalizeValue(input.mediaKey);

    if (!mediaKey) {
      throw new Error('mediaKey is required');
    }

    const result = await admin.from('media_reviews').delete().eq('user_id', userId).eq('media_key', mediaKey);

    if (result.error) {
      throw new Error(result.error.message || 'Media review delete failed');
    }

    return {
      contentType,
      identifier: {
        mediaKey,
      },
    };
  }

  if (contentType === 'list_review') {
    const listId = normalizeValue(input.listId);

    if (!listId) {
      throw new Error('listId is required');
    }

    const result = await admin.from('list_reviews').delete().eq('user_id', userId).eq('list_id', listId);

    if (result.error) {
      throw new Error(result.error.message || 'List review delete failed');
    }

    return {
      contentType,
      identifier: {
        listId,
      },
    };
  }

  if (contentType === 'watchlist') {
    const mediaKey = normalizeValue(input.mediaKey);

    if (!mediaKey) {
      throw new Error('mediaKey is required');
    }

    const result = await admin.from('watchlist').delete().eq('user_id', userId).eq('media_key', mediaKey);

    if (result.error) {
      throw new Error(result.error.message || 'Watchlist delete failed');
    }

    return {
      contentType,
      identifier: {
        mediaKey,
      },
    };
  }

  if (contentType === 'watched') {
    const mediaKey = normalizeValue(input.mediaKey);

    if (!mediaKey) {
      throw new Error('mediaKey is required');
    }

    const result = await admin.from('watched').delete().eq('user_id', userId).eq('media_key', mediaKey);

    if (result.error) {
      throw new Error(result.error.message || 'Watched delete failed');
    }

    return {
      contentType,
      identifier: {
        mediaKey,
      },
    };
  }

  if (contentType === 'notification') {
    const notificationId = normalizeValue(input.notificationId || input.id);

    if (!notificationId) {
      throw new Error('notificationId is required');
    }

    const result = await admin.from('notifications').delete().eq('user_id', userId).eq('id', notificationId);

    if (result.error) {
      throw new Error(result.error.message || 'Notification delete failed');
    }

    return {
      contentType,
      identifier: {
        notificationId,
      },
    };
  }

  throw new Error('Unsupported contentType');
}

async function purgeUserData(admin, userId) {
  const listIdsResult = await admin.from('lists').select('id').eq('user_id', userId);

  if (listIdsResult.error) {
    throw new Error(listIdsResult.error.message || 'User list lookup failed');
  }

  const listIds = (listIdsResult.data || []).map((row) => normalizeValue(row?.id)).filter(Boolean);

  const operations = [
    () => admin.from('review_likes').delete().eq('user_id', userId),
    () => admin.from('review_likes').delete().eq('review_user_id', userId),
    () => admin.from('list_likes').delete().eq('user_id', userId),
    () => admin.from('follows').delete().or(`follower_id.eq.${userId},following_id.eq.${userId}`),
    () => admin.from('watchlist').delete().eq('user_id', userId),
    () => admin.from('watched').delete().eq('user_id', userId),
    () => admin.from('activity').delete().eq('user_id', userId),
    () => admin.from('notifications').delete().eq('user_id', userId),
    () => admin.from('list_items').delete().eq('user_id', userId),
    () => admin.from('list_reviews').delete().eq('user_id', userId),
    () => admin.from('media_reviews').delete().eq('user_id', userId),
    () => admin.from('lists').delete().eq('user_id', userId),
    () => admin.from('profile_counters').delete().eq('user_id', userId),
    () => admin.from('account_lifecycle').delete().eq('user_id', userId),
    () => admin.from('usernames').delete().eq('user_id', userId),
    () => admin.from('profiles').delete().eq('id', userId),
  ];

  if (listIds.length > 0) {
    operations.unshift(() => admin.from('list_likes').delete().in('list_id', listIds));
    operations.unshift(() => admin.from('list_reviews').delete().in('list_id', listIds));
    operations.unshift(() => admin.from('list_items').delete().in('list_id', listIds));
  }

  for (const execute of operations) {
    const result = await execute();

    if (result.error) {
      throw new Error(result.error.message || 'User data purge failed');
    }
  }
}

export async function loadAdminUsersPayload(options = {}) {
  const admin = createAdminClient();
  const { page, pageSize, searchTerm, providerFilter, dateRangeDays } = normalizeAdminUsersQuery(options);
  const requiresScan = Boolean(searchTerm || providerFilter || dateRangeDays);

  const errors = [];
  let users = [];
  let pagination = {
    hasMore: false,
    page,
    pageSize,
    total: 0,
    totalPages: 1,
  };

  try {
    if (requiresScan) {
      const searchResult = await scanUsersForSearch(admin, searchTerm);
      const filteredUsers = applyAuthUserFilters(searchResult.filtered || [], {
        dateRangeDays,
        providerFilter,
      });
      const offset = (page - 1) * pageSize;
      const pageUsers = filteredUsers.slice(offset, offset + pageSize);

      users = pageUsers;
      pagination = resolveUsersPagination({
        hasMore: offset + pageSize < filteredUsers.length,
        items: pageUsers,
        page,
        pageSize,
        searchApplied: true,
        total: filteredUsers.length,
      });
    } else {
      const pageResult = await listUsersPage(admin, {
        page,
        pageSize,
      });

      users = pageResult.users || [];
      pagination = resolveUsersPagination({
        hasMore: Boolean(pageResult.pagination?.nextPage),
        items: users,
        page,
        pageSize,
        searchApplied: false,
        total: normalizeInteger(pageResult.pagination?.total, 0),
      });
    }
  } catch (error) {
    errors.push({
      code: 'ADMIN_USERS_LIST_FAILED',
      message: normalizeValue(error?.message) || 'Users list could not be loaded',
      source: 'auth_users',
    });
  }

  const userIds = users.map((user) => normalizeValue(user?.id)).filter(Boolean);
  const [profileMapResult, lifecycleMapResult, counterMapResult] = await Promise.all([
    safeLoad('profiles', () => loadMapByIds(admin, 'profiles', 'id', userIds, 'id,username,display_name,is_private,updated_at')),
    safeLoad('account_lifecycle', () =>
      loadMapByIds(
        admin,
        'account_lifecycle',
        'user_id',
        userIds,
        'user_id,state,state_reason,deleted_at,pending_operation_key'
      )
    ),
    safeLoad('profile_counters', () =>
      loadMapByIds(
        admin,
        'profile_counters',
        'user_id',
        userIds,
        'user_id,follower_count,following_count,likes_count,lists_count,watched_count,watchlist_count'
      )
    ),
  ]);

  if (profileMapResult.error) {
    errors.push(profileMapResult.error);
  }

  if (lifecycleMapResult.error) {
    errors.push(lifecycleMapResult.error);
  }

  if (counterMapResult.error) {
    errors.push(counterMapResult.error);
  }

  const profileMap = profileMapResult.data || new Map();
  const lifecycleMap = lifecycleMapResult.data || new Map();
  const counterMap = counterMapResult.data || new Map();

  const items = users.map((user) =>
    mapListItem({
      counters: counterMap.get(normalizeValue(user?.id)) || null,
      lifecycle: lifecycleMap.get(normalizeValue(user?.id)) || null,
      profile: profileMap.get(normalizeValue(user?.id)) || null,
      user,
    })
  );

  return createAdminPayload({
    data: {
      dateRangeDays,
      items,
      pagination,
      providerFilter,
      searchTerm,
    },
    errors,
    partial: errors.length > 0,
    widgets: resolveListWidgets(items),
  });
}

export async function loadAdminUserDetailPayload({ userId } = {}) {
  const normalizedUserId = normalizeValue(userId);

  if (!normalizedUserId) {
    throw new Error('userId is required');
  }

  const admin = createAdminClient();
  const userResult = await admin.auth.admin.getUserById(normalizedUserId);

  if (userResult.error) {
    throw new Error(userResult.error.message || 'Auth user could not be loaded');
  }

  const user = userResult.data?.user || null;

  if (!user?.id) {
    throw new Error('Auth user not found');
  }

  const [
    profileResult,
    lifecycleResult,
    countersResult,
    usernamesResult,
    followsIncomingCountResult,
    followsOutgoingCountResult,
    listsCountResult,
    listItemsCountResult,
    mediaReviewsCountResult,
    listReviewsCountResult,
    reviewLikesCountResult,
    listLikesCountResult,
    watchlistCountResult,
    watchedCountResult,
    activityCountResult,
    notificationsCountResult,
    authAuditLogsCountResult,
    followsIncomingRowsResult,
    followsOutgoingRowsResult,
    listsRowsResult,
    listItemsRowsResult,
    mediaReviewsRowsResult,
    listReviewsRowsResult,
    watchlistRowsResult,
    watchedRowsResult,
    activityRowsResult,
    notificationsRowsResult,
    authAuditRowsResult,
  ] = await Promise.all([
    safeLoad('profile', async () => {
      const result = await admin.from('profiles').select('*').eq('id', normalizedUserId).maybeSingle();

      if (result.error) {
        throw new Error(result.error.message || 'Profile could not be loaded');
      }

      return result.data || null;
    }),
    safeLoad('account_lifecycle', async () => {
      const result = await admin.from('account_lifecycle').select('*').eq('user_id', normalizedUserId).maybeSingle();

      if (result.error) {
        throw new Error(result.error.message || 'Lifecycle row could not be loaded');
      }

      return result.data || null;
    }),
    safeLoad('profile_counters', async () => {
      const result = await admin.from('profile_counters').select('*').eq('user_id', normalizedUserId).maybeSingle();

      if (result.error) {
        throw new Error(result.error.message || 'Profile counters could not be loaded');
      }

      return result.data || null;
    }),
    safeLoad('usernames', async () => {
      const result = await admin.from('usernames').select('*').eq('user_id', normalizedUserId);

      if (result.error) {
        throw new Error(result.error.message || 'Username mappings could not be loaded');
      }

      return Array.isArray(result.data) ? result.data : [];
    }),
    safeLoad('follows_incoming_count', () => countByColumn(admin, 'follows', 'following_id', normalizedUserId)),
    safeLoad('follows_outgoing_count', () => countByColumn(admin, 'follows', 'follower_id', normalizedUserId)),
    safeLoad('lists_count', () => countByColumn(admin, 'lists', 'user_id', normalizedUserId)),
    safeLoad('list_items_count', () => countByColumn(admin, 'list_items', 'user_id', normalizedUserId)),
    safeLoad('media_reviews_count', () => countByColumn(admin, 'media_reviews', 'user_id', normalizedUserId)),
    safeLoad('list_reviews_count', () => countByColumn(admin, 'list_reviews', 'user_id', normalizedUserId)),
    safeLoad('review_likes_count', () => countByColumn(admin, 'review_likes', 'user_id', normalizedUserId)),
    safeLoad('list_likes_count', () => countByColumn(admin, 'list_likes', 'user_id', normalizedUserId)),
    safeLoad('watchlist_count', () => countByColumn(admin, 'watchlist', 'user_id', normalizedUserId)),
    safeLoad('watched_count', () => countByColumn(admin, 'watched', 'user_id', normalizedUserId)),
    safeLoad('activity_count', () => countByColumn(admin, 'activity', 'user_id', normalizedUserId)),
    safeLoad('notifications_count', () => countByColumn(admin, 'notifications', 'user_id', normalizedUserId)),
    safeLoad('auth_audit_logs_count', () => countByColumn(admin, 'auth_audit_logs', 'user_id', normalizedUserId)),
    safeLoad('follows_incoming_rows', () =>
      fetchRecentRowsByColumn(admin, {
        column: 'following_id',
        limit: 30,
        orderColumns: ['created_at', 'updated_at'],
        table: 'follows',
        value: normalizedUserId,
      })
    ),
    safeLoad('follows_outgoing_rows', () =>
      fetchRecentRowsByColumn(admin, {
        column: 'follower_id',
        limit: 30,
        orderColumns: ['created_at', 'updated_at'],
        table: 'follows',
        value: normalizedUserId,
      })
    ),
    safeLoad('lists_rows', () =>
      fetchRecentRowsByColumn(admin, {
        column: 'user_id',
        limit: 40,
        orderColumns: ['updated_at', 'created_at'],
        table: 'lists',
        value: normalizedUserId,
      })
    ),
    safeLoad('list_items_rows', () =>
      fetchRecentRowsByColumn(admin, {
        column: 'user_id',
        limit: 40,
        orderColumns: ['added_at', 'updated_at', 'created_at'],
        table: 'list_items',
        value: normalizedUserId,
      })
    ),
    safeLoad('media_reviews_rows', () =>
      fetchRecentRowsByColumn(admin, {
        column: 'user_id',
        limit: 40,
        orderColumns: ['updated_at', 'created_at'],
        table: 'media_reviews',
        value: normalizedUserId,
      })
    ),
    safeLoad('list_reviews_rows', () =>
      fetchRecentRowsByColumn(admin, {
        column: 'user_id',
        limit: 40,
        orderColumns: ['updated_at', 'created_at'],
        table: 'list_reviews',
        value: normalizedUserId,
      })
    ),
    safeLoad('watchlist_rows', () =>
      fetchRecentRowsByColumn(admin, {
        column: 'user_id',
        limit: 40,
        orderColumns: ['added_at', 'updated_at', 'created_at'],
        table: 'watchlist',
        value: normalizedUserId,
      })
    ),
    safeLoad('watched_rows', () =>
      fetchRecentRowsByColumn(admin, {
        column: 'user_id',
        limit: 40,
        orderColumns: ['last_watched_at', 'updated_at', 'created_at'],
        table: 'watched',
        value: normalizedUserId,
      })
    ),
    safeLoad('activity_rows', () =>
      fetchRecentRowsByColumn(admin, {
        column: 'user_id',
        limit: 80,
        orderColumns: ['created_at', 'updated_at'],
        table: 'activity',
        value: normalizedUserId,
      })
    ),
    safeLoad('notifications_rows', () =>
      fetchRecentRowsByColumn(admin, {
        column: 'user_id',
        limit: 50,
        orderColumns: ['created_at', 'updated_at'],
        table: 'notifications',
        value: normalizedUserId,
      })
    ),
    safeLoad('auth_audit_logs_rows', () =>
      fetchRecentRowsByColumn(admin, {
        column: 'user_id',
        limit: 80,
        orderColumns: ['created_at', 'updated_at'],
        table: 'auth_audit_logs',
        value: normalizedUserId,
      })
    ),
  ]);

  const errors = [
    profileResult.error,
    lifecycleResult.error,
    countersResult.error,
    usernamesResult.error,
    followsIncomingCountResult.error,
    followsOutgoingCountResult.error,
    listsCountResult.error,
    listItemsCountResult.error,
    mediaReviewsCountResult.error,
    listReviewsCountResult.error,
    reviewLikesCountResult.error,
    listLikesCountResult.error,
    watchlistCountResult.error,
    watchedCountResult.error,
    activityCountResult.error,
    notificationsCountResult.error,
    authAuditLogsCountResult.error,
    followsIncomingRowsResult.error,
    followsOutgoingRowsResult.error,
    listsRowsResult.error,
    listItemsRowsResult.error,
    mediaReviewsRowsResult.error,
    listReviewsRowsResult.error,
    watchlistRowsResult.error,
    watchedRowsResult.error,
    activityRowsResult.error,
    notificationsRowsResult.error,
    authAuditRowsResult.error,
  ].filter(Boolean);

  return createAdminPayload({
    data: {
      auth: mapDetailUser(user),
      content: {
        listItems: listItemsRowsResult.data || [],
        listReviews: listReviewsRowsResult.data || [],
        lists: listsRowsResult.data || [],
        mediaReviews: mediaReviewsRowsResult.data || [],
        watched: watchedRowsResult.data || [],
        watchlist: watchlistRowsResult.data || [],
      },
      lifecycle: lifecycleResult.data || null,
      profile: profileResult.data || null,
      profileCounters: countersResult.data || null,
      recent: {
        activity: activityRowsResult.data || [],
        authAuditLogs: authAuditRowsResult.data || [],
        followsIncoming: followsIncomingRowsResult.data || [],
        followsOutgoing: followsOutgoingRowsResult.data || [],
        notifications: notificationsRowsResult.data || [],
      },
      relationshipCounts: {
        activity: normalizeInteger(activityCountResult.data, 0),
        authAuditLogs: normalizeInteger(authAuditLogsCountResult.data, 0),
        followsIncoming: normalizeInteger(followsIncomingCountResult.data, 0),
        followsOutgoing: normalizeInteger(followsOutgoingCountResult.data, 0),
        listItems: normalizeInteger(listItemsCountResult.data, 0),
        listLikes: normalizeInteger(listLikesCountResult.data, 0),
        listReviews: normalizeInteger(listReviewsCountResult.data, 0),
        lists: normalizeInteger(listsCountResult.data, 0),
        mediaReviews: normalizeInteger(mediaReviewsCountResult.data, 0),
        notifications: normalizeInteger(notificationsCountResult.data, 0),
        reviewLikes: normalizeInteger(reviewLikesCountResult.data, 0),
        watched: normalizeInteger(watchedCountResult.data, 0),
        watchlist: normalizeInteger(watchlistCountResult.data, 0),
      },
      usernames: usernamesResult.data || [],
      userId: normalizedUserId,
    },
    errors,
    partial: errors.length > 0,
    widgets: [],
  });
}

export async function runAdminUserAction({
  userId,
  action,
  input = {},
} = {}) {
  const normalizedUserId = normalizeValue(userId);
  const normalizedAction = normalizeLowerValue(action);

  if (!normalizedUserId) {
    throw new Error('userId is required');
  }

  if (!normalizedAction) {
    throw new Error('action is required');
  }

  const admin = createAdminClient();

  if (normalizedAction === 'update_profile') {
    const row = await updateProfile(admin, normalizedUserId, input);

    return {
      action: normalizedAction,
      message: 'Profile updated',
      row,
    };
  }

  if (normalizedAction === 'update_auth') {
    const currentUserResult = await admin.auth.admin.getUserById(normalizedUserId);

    if (currentUserResult.error) {
      throw new Error(currentUserResult.error.message || 'Auth user could not be loaded');
    }

    const currentUser = currentUserResult.data?.user || null;

    if (!currentUser?.id) {
      throw new Error('Auth user not found');
    }

    const updates = buildUpdateAuthPayload(currentUser, input);
    const updateResult = await admin.auth.admin.updateUserById(normalizedUserId, updates);

    if (updateResult.error) {
      throw new Error(updateResult.error.message || 'Auth update failed');
    }

    return {
      action: normalizedAction,
      message: 'Auth settings updated',
      row: mapDetailUser(updateResult.data?.user || currentUser),
    };
  }

  if (normalizedAction === 'ban_user') {
    const banHours = Math.max(1, normalizeInteger(input.banDurationHours, 24 * 30));
    const result = await admin.auth.admin.updateUserById(normalizedUserId, {
      ban_duration: `${banHours}h`,
    });

    if (result.error) {
      throw new Error(result.error.message || 'User ban failed');
    }

    return {
      action: normalizedAction,
      message: `User banned for ${banHours}h`,
      row: mapDetailUser(result.data?.user || null),
    };
  }

  if (normalizedAction === 'unban_user') {
    const result = await admin.auth.admin.updateUserById(normalizedUserId, {
      ban_duration: 'none',
    });

    if (result.error) {
      throw new Error(result.error.message || 'User unban failed');
    }

    return {
      action: normalizedAction,
      message: 'User unbanned',
      row: mapDetailUser(result.data?.user || null),
    };
  }

  if (normalizedAction === 'revoke_sessions') {
    await invokeSessionControl({
      reason: normalizeValue(input.reason) || 'admin-revoke',
      userId: normalizedUserId,
    });

    return {
      action: normalizedAction,
      message: 'Sessions revoked',
      row: {
        userId: normalizedUserId,
      },
    };
  }

  if (normalizedAction === 'update_content') {
    const contentResult = await updateContent(admin, normalizedUserId, input);

    return {
      action: normalizedAction,
      message: 'Content updated',
      row: contentResult,
    };
  }

  if (normalizedAction === 'delete_content') {
    const contentResult = await deleteContent(admin, normalizedUserId, input);

    return {
      action: normalizedAction,
      message: 'Content deleted',
      row: contentResult,
    };
  }

  if (normalizedAction === 'delete_user') {
    const confirmText = normalizeValue(input.confirmText);
    const expectedConfirm = `DELETE ${normalizedUserId}`;

    if (confirmText !== expectedConfirm) {
      throw new Error(`confirmText must exactly match: ${expectedConfirm}`);
    }

    const purgeData = input.purgeData !== false;
    const deleteAuthUser = input.deleteAuthUser !== false;

    if (purgeData) {
      await purgeUserData(admin, normalizedUserId);
    }

    if (deleteAuthUser) {
      const deleteResult = await admin.auth.admin.deleteUser(normalizedUserId, false);

      if (deleteResult.error) {
        throw new Error(deleteResult.error.message || 'Auth user delete failed');
      }
    }

    return {
      action: normalizedAction,
      message: 'User deleted',
      row: {
        deleteAuthUser,
        purgeData,
        userId: normalizedUserId,
      },
    };
  }

  throw new Error('Unsupported action');
}

export function readAdminUsersQueryFromRequest(request) {
  const url = new URL(request.url);

  return normalizeAdminUsersQuery({
    dateRangeDays: url.searchParams.get('dateRangeDays'),
    page: url.searchParams.get('page'),
    pageSize: url.searchParams.get('pageSize'),
    providerFilter: url.searchParams.get('providerFilter'),
    searchTerm: url.searchParams.get('searchTerm'),
  });
}
