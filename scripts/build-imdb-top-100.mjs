import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const rootDirectory = process.cwd();
const sourceDirectory = resolve(rootDirectory, 'assets/imdb');
const destination = resolve(rootDirectory, 'domains/home/shared/imdb-top-100-data.js');
const MAX_ENTRIES = 100;

function parseCsv(source) {
  const rows = [];
  let cell = '';
  let isQuoted = false;
  let row = [];

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const nextCharacter = source[index + 1];

    if (character === '"' && isQuoted && nextCharacter === '"') {
      cell += '"';
      index += 1;
      continue;
    }
    if (character === '"') {
      isQuoted = !isQuoted;
      continue;
    }
    if (character === ',' && !isQuoted) {
      row.push(cell.trim());
      cell = '';
      continue;
    }
    if ((character === '\n' || character === '\r') && !isQuoted) {
      if (character === '\r' && nextCharacter === '\n') index += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = '';
      continue;
    }
    cell += character;
  }

  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);

  return rows;
}

function normalizeHeader(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replaceAll(' ', '_');
}

function toNumber(value) {
  const number = Number(String(value || '').trim());
  return Number.isFinite(number) ? number : null;
}

function readTopEntries(rows, { rankKeys = ['rank'], rankOffset = 0, titleKeys, yearKeys }) {
  const [headers = [], ...dataRows] = rows;
  const headerIndex = new Map(headers.map((header, index) => [normalizeHeader(header), index]));
  const getValue = (row, keys) => {
    const index = keys.map((key) => headerIndex.get(key)).find((value) => value !== undefined);
    return index === undefined ? '' : row[index] || '';
  };

  return dataRows
    .map((row, rowIndex) => ({
      rank: (toNumber(getValue(row, rankKeys)) ?? rowIndex) + rankOffset,
      rating: toNumber(getValue(row, ['rating'])),
      title: getValue(row, titleKeys),
      year: toNumber(getValue(row, yearKeys)),
    }))
    .filter((entry) => entry.rank > 0 && entry.title)
    .sort((left, right) => left.rank - right.rank)
    .slice(0, MAX_ENTRIES);
}

function createModule(movies, tvShows) {
  return `// Generated from assets/imdb by scripts/build-imdb-top-100.mjs. Do not edit manually.\n\nexport const IMDB_TOP_100_MOVIES = Object.freeze(${JSON.stringify(movies, null, 2)});\n\nexport const IMDB_TOP_100_TV_SHOWS = Object.freeze(${JSON.stringify(tvShows, null, 2)});\n`;
}

const [movieSource, tvSource] = await Promise.all([
  readFile(resolve(sourceDirectory, 'top_250_movies.csv'), 'utf8'),
  readFile(resolve(sourceDirectory, 'top_250_tv_shows.csv'), 'utf8'),
]);

const movies = readTopEntries(parseCsv(movieSource), {
  rankOffset: 0,
  titleKeys: ['name', 'title'],
  yearKeys: ['year', 'started'],
});
const tvShows = readTopEntries(parseCsv(tvSource), {
  rankKeys: ['rank', ''],
  rankOffset: 1,
  titleKeys: ['title', 'name'],
  yearKeys: ['started', 'year'],
});

if (movies.length !== MAX_ENTRIES || tvShows.length !== MAX_ENTRIES) {
  throw new Error(
    `Expected ${MAX_ENTRIES} entries per IMDb chart; received ${movies.length} movies and ${tvShows.length} TV shows.`,
  );
}

await writeFile(destination, createModule(movies, tvShows));
