const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'
).replace(/\/$/, '');

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers
    }
  });

  const raw = await response.text();
  let data;

  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = raw;
  }

  if (!response.ok) {
    throw new Error(
      data?.message || data?.error || `Request failed (${response.status})`
    );
  }

  return data;
}

export const api = {
  baseUrl: API_BASE,

  async getFeed(profileId, mode = 'personalized') {
    const common = new URLSearchParams({ limit: '50', mode });
    if (profileId && mode !== 'explore') common.set('userId', profileId);

    // Fetch papers and news independently so a recent burst of news cannot
    // crowd every research paper out of the mixed feed.
    const [paperResult, newsResult] = await Promise.all([
      request(`/items?${new URLSearchParams({ ...Object.fromEntries(common), type: 'paper' })}`),
      request(`/items?${new URLSearchParams({ ...Object.fromEntries(common), type: 'news' })}`)
    ]);

    return {
      papers: paperResult.items || [],
      stories: newsResult.items || []
    };
  },

  async createProfile(profile) {
    let userId =
      profile.id ||
      profile._id ||
      localStorage.getItem('sasi-user-id');

    if (!userId) {
      userId = crypto.randomUUID();
    }

    const result = await request('/profiles', {
      method: 'POST',
      body: JSON.stringify({
        userId,
        name: profile.name || 'AI Explorer',
        goal: profile.goal || 'student',
        interests: profile.topics || [],
        projectDescription: profile.project || ''
      })
    });

    localStorage.setItem('sasi-user-id', userId);

    return result;
  },

  async getProfile(profileId) {
    return request(`/profiles/${encodeURIComponent(profileId)}`);
  },

  async sendFeedback(itemId, action, profileId) {
    if (!profileId) {
      throw new Error('Complete profile setup before submitting feedback.');
    }

    return request('/feedback', {
      method: 'POST',
      body: JSON.stringify({
        userId: profileId,
        itemId,
        action
      })
    });
  }
};
