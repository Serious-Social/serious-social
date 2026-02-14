import { keccak256, toHex, toBytes } from 'viem';
import { generatePostId } from '../../src/lib/postId';
import { SimLogger } from '../logger';

export interface SimTopic {
  postId: `0x${string}`;
  castHash: string;
  title: string;
}

interface NewsApiArticle {
  title: string;
  description: string | null;
  source: { name: string };
}

interface NewsApiResponse {
  status: string;
  totalResults: number;
  articles: NewsApiArticle[];
}

const CATEGORIES = ['technology', 'business', 'science', 'general'];

const FALLBACK_CLAIMS = [
  'AI will replace 50% of white-collar jobs by 2030',
  'Bitcoin will hit $200k within 12 months',
  'Remote work is more productive than office work',
  'Social media does more harm than good to democracy',
  'Electric vehicles will outsell gas cars by 2028',
  'The US will enter a recession this year',
  'Quantum computing will break modern encryption by 2030',
  'Lab-grown meat will be cheaper than farmed meat by 2027',
  'TikTok will be banned in the US permanently',
  'Interest rates will drop below 3% by end of year',
  'Apple will release AR glasses this year',
  'The housing market will crash in the next 18 months',
  'Autonomous vehicles will be mainstream within 5 years',
  'Nuclear fusion will generate commercial power by 2035',
  'Streaming services will replace all traditional TV by 2030',
  'The US dollar will lose its reserve currency status this decade',
  'Gene therapy will cure most genetic diseases by 2035',
  'Space tourism will become affordable for middle class by 2032',
  'Cryptocurrency will replace traditional banking for 1B people',
  'Climate change will cause mass migration from coastal cities by 2040',
];

/**
 * Generate a deterministic fake cast hash from a title string.
 * Returns a 0x-prefixed 40-char hex string (20 bytes).
 */
function titleToCastHash(title: string): string {
  const fullHash = keccak256(toBytes(`sim-${title}`));
  // Truncate to 20 bytes (40 hex chars + 0x prefix)
  return `0x${fullHash.slice(2, 42)}`;
}

/**
 * Fetch real news headlines from NewsAPI.org and convert to simulation topics.
 * Falls back to hardcoded claims if the API is unavailable.
 */
export async function loadTopics(
  newsApiKey: string,
  targetCount: number,
  logger: SimLogger,
): Promise<SimTopic[]> {
  const titles = new Set<string>();

  if (newsApiKey) {
    logger.info('market', 'Fetching real headlines from NewsAPI.org...');

    for (const category of CATEGORIES) {
      try {
        const url = `https://newsapi.org/v2/top-headlines?country=us&category=${category}&pageSize=20`;
        const res = await fetch(url, {
          headers: { 'X-Api-Key': newsApiKey },
        });

        if (!res.ok) {
          logger.warn('market', `NewsAPI ${category} failed: ${res.status}`);
          continue;
        }

        const data = (await res.json()) as NewsApiResponse;
        for (const article of data.articles) {
          if (article.title && !article.title.includes('[Removed]')) {
            // Clean up common suffixes like " - CNN", " | Reuters"
            const cleaned = article.title
              .replace(/\s*[-|]\s*[A-Za-z\s]+$/, '')
              .trim();
            if (cleaned.length > 15) {
              titles.add(cleaned);
            }
          }
        }

        logger.debug('market', `Fetched ${data.articles.length} headlines from ${category}`);
      } catch (err) {
        logger.warn('market', `NewsAPI ${category} error: ${(err as Error).message}`);
      }
    }
  }

  // Fill with fallbacks if needed
  if (titles.size < targetCount) {
    logger.info('market', `Got ${titles.size} headlines, filling with fallback claims...`);
    for (const claim of FALLBACK_CLAIMS) {
      titles.add(claim);
      if (titles.size >= targetCount) break;
    }
  }

  // Convert to topics
  const topics: SimTopic[] = [];
  for (const title of titles) {
    if (topics.length >= targetCount) break;

    const castHash = titleToCastHash(title);
    const postId = generatePostId(castHash);

    topics.push({ postId, castHash, title });
  }

  logger.info('market', `Loaded ${topics.length} topics (${titles.size - FALLBACK_CLAIMS.length > 0 ? 'real headlines' : 'fallback claims'})`);
  return topics;
}
