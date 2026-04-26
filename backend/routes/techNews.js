const express = require('express');
const axios = require('axios');
const Parser = require('rss-parser');

const router = express.Router();
const parser = new Parser({
    customFields: {
        item: ['media:content', 'enclosure', 'content:encoded', 'description']
    }
});

// Helper to extract an image from an RSS item
const extractImage = (item) => {
    if (item['media:content'] && item['media:content'].$) return item['media:content'].$.url;
    if (item.enclosure && item.enclosure.url) return item.enclosure.url;
    if (item['content:encoded'] && item['content:encoded'].match(/<img[^>]+src="([^">]+)"/)) {
        return item['content:encoded'].match(/<img[^>]+src="([^">]+)"/)[1];
    }
    if (item.description && item.description.match(/<img[^>]+src="([^">]+)"/)) {
        return item.description.match(/<img[^>]+src="([^">]+)"/)[1];
    }
    return null;
};

// @route   GET /api/tech-news
// @desc    Fetch latest tech news with category filtering
// @access  Public
router.get('/', async (req, res) => {
    try {
        const category = req.query.category || 'all';
        let articles = [];

        // Define sources based on category
        let fetchIndia = category === 'india' || category === 'all';
        let fetchDevToAI = category === 'ai' || category === 'all';
        let fetchDevToProgramming = category === 'programming' || category === 'all';
        let fetchGlobal = category === 'global' || category === 'all';

        // Fetch Indian Tech News via RSS
        if (fetchIndia) {
            const rssFeeds = [
                { url: 'https://timesofindia.indiatimes.com/rssfeeds/66949542.cms', name: 'TOI Tech' },
                { url: 'https://www.thehindu.com/sci-tech/technology/feeder/default.rss', name: 'The Hindu Tech' }
            ];
            for (const feedConfig of rssFeeds) {
                try {
                    const feed = await parser.parseURL(feedConfig.url);
                    // Fetch more if it's the specific category
                    const limit = category === 'india' ? 12 : 5;
                    const feedArticles = feed.items.slice(0, limit).map(item => ({
                        id: item.guid || item.link,
                        title: item.title,
                        description: (item.contentSnippet || item.description || '').replace(/<[^>]*>?/gm, '').substring(0, 150) + '...',
                        url: item.link,
                        source: feedConfig.name,
                        publishedDate: item.isoDate || item.pubDate,
                        tags: item.categories || ['Tech', 'India'],
                        coverImage: extractImage(item) || 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=500&q=80',
                        author: {
                            name: item.creator || feedConfig.name,
                            username: feedConfig.name.replace(/\s+/g, '').toLowerCase(),
                            profileImage: 'https://cdn-icons-png.flaticon.com/512/3242/3242120.png'
                        },
                        readingTime: Math.ceil(((item.contentSnippet || item.description || '').length) / 200) || 3,
                        reactions: Math.floor(Math.random() * 200) + 10
                    }));
                    articles = [...articles, ...feedArticles];
                } catch (err) {
                    console.error(`Error parsing feed ${feedConfig.url}:`, err.message);
                }
            }
        }

        // Helper function for fetching from dev.to
        const fetchDevTo = async (tag, limit, sourceName) => {
            try {
                const response = await axios.get('https://dev.to/api/articles', {
                    params: { tag, per_page: limit, top: 7 }
                });
                return response.data.map(article => ({
                    id: article.id.toString(),
                    title: article.title,
                    description: article.description,
                    url: article.url,
                    source: sourceName,
                    publishedDate: article.published_at,
                    tags: article.tag_list,
                    coverImage: article.cover_image || article.social_image || 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=500&q=80',
                    author: {
                        name: article.user.name,
                        username: article.user.username,
                        profileImage: article.user.profile_image_90
                    },
                    readingTime: article.reading_time_minutes,
                    reactions: article.public_reactions_count
                }));
            } catch (err) {
                console.error(`Error fetching dev.to tag=${tag}:`, err.message);
                return [];
            }
        };

        if (fetchDevToAI) {
            const limit = category === 'ai' ? 15 : 3;
            const aiArticles = await fetchDevTo('ai', limit, 'Dev.to (AI)');
            articles = [...articles, ...aiArticles];
        }

        if (fetchDevToProgramming) {
            const limit = category === 'programming' ? 15 : 4;
            const progArticles = await fetchDevTo('programming', limit, 'Dev.to (Code)');
            articles = [...articles, ...progArticles];
        }

        if (fetchGlobal && category === 'global') {
            const limit = 15;
            const globalArticles = await fetchDevTo('software', limit, 'Dev.to (Global)');
            articles = [...articles, ...globalArticles];
        }

        // Deduplicate articles by ID
        const uniqueArticlesMap = new Map();
        articles.forEach(article => {
            if (!uniqueArticlesMap.has(article.id)) {
                uniqueArticlesMap.set(article.id, article);
            }
        });
        articles = Array.from(uniqueArticlesMap.values());

        // Sort by date (newest first)
        articles.sort((a, b) => new Date(b.publishedDate) - new Date(a.publishedDate));

        res.json(articles);

    } catch (err) {
        console.error('Error fetching tech news:', err.message);
        res.status(500).json({ message: 'Failed to fetch tech news' });
    }
});

module.exports = router;

