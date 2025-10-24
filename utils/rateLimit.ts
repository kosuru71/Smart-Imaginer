const RATE_LIMIT_KEY = 'generationRateLimit';
const MAX_GENERATIONS_PER_DAY = 20;

interface RateLimitData {
  date: string; // YYYY-MM-DD
  count: number;
}

const getTodayString = (): string => {
  const today = new Date();
  return today.toISOString().split('T')[0]; // YYYY-MM-DD format
};

const getRateLimitData = (): RateLimitData => {
  try {
    const data = localStorage.getItem(RATE_LIMIT_KEY);
    if (data) {
      const parsed = JSON.parse(data) as RateLimitData;
      const today = getTodayString();
      if (parsed.date === today) {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Failed to parse rate limit data", e);
  }
  // If no data, data for a previous day, or corrupted data, return fresh data for today
  return { date: getTodayString(), count: 0 };
};

const setRateLimitData = (data: RateLimitData) => {
  try {
    localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("Failed to set rate limit data in localStorage", e);
  }
};

export const canGenerate = (): boolean => {
  const data = getRateLimitData();
  return data.count < MAX_GENERATIONS_PER_DAY;
};

export const incrementGenerationCount = () => {
  const data = getRateLimitData();
  if (data.count < MAX_GENERATIONS_PER_DAY) {
    data.count += 1;
    setRateLimitData(data);
  }
};

export const getRemainingGenerations = (): number => {
  const data = getRateLimitData();
  const remaining = MAX_GENERATIONS_PER_DAY - data.count;
  return remaining > 0 ? remaining : 0;
};