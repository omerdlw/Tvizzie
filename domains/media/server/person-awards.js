import { TmdbService } from '@/infrastructure/tmdb/services/tmdb-service';

export async function GET(req, { params }) {
  try {
    const personId = params?.id || null;
    if (!personId) {
      return new Response(JSON.stringify({ error: 'missing_person_id' }), { status: 400 });
    }

    const response = await TmdbService.getPersonAwards(personId);
    if (!response) {
      return new Response(JSON.stringify({ error: 'no_data' }), { status: 404 });
    }

    return new Response(JSON.stringify({ data: response.data || null }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err?.message || 'unknown_error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
