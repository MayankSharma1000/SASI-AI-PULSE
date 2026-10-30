const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'
).replace(/\/$/, '');

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
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

  async register(name, email, password) {
    return request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password })
    });
  },

  async login(email, password) {
    return request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  },

  async getSession() {
    return request('/auth/me');
  },

  async logout() {
    return request('/auth/logout', { method: 'POST' });
  },

  async completeOnboarding(values) {
    return request('/auth/onboarding', {
      method: 'PATCH',
      body: JSON.stringify({
        goal: values.goal || 'student',
        interests: values.topics || [],
        projectDescription: values.project || ''
      })
    });
  },

  async updateProfile(values) {
    return request('/profiles', {
      method: 'POST',
      body: JSON.stringify({
        name: values.name,
        goal: values.goal || 'student',
        interests: values.topics || [],
        projectDescription: values.project || ''
      })
    });
  },

  async getFeed(profileId, mode = 'personalized') {
    const common = new URLSearchParams({ limit: '50', mode });

    if (profileId && mode !== 'explore') {
      common.set('userId', profileId);
    }

    const [paperResult, newsResult] = await Promise.all([
      request(`/items?${new URLSearchParams({
        ...Object.fromEntries(common),
        type: 'paper'
      })}`),
      request(`/items?${new URLSearchParams({
        ...Object.fromEntries(common),
        type: 'news'
      })}`)
    ]);

    return {
      papers: paperResult.items || [],
      stories: newsResult.items || []
    };
  },

  async getSavedItems() {
    return request('/feedback/saved');
  },

  async getLikedItems() {
    return request('/feedback/liked');
  },

  async getDismissedItems() {
    return request('/feedback/dismissed');
  },

  async sendFeedback(itemId, action) {
    return request('/feedback', {
      method: 'POST',
      body: JSON.stringify({ itemId, action })
    });
  }
};
