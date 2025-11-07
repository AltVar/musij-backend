const express = require('express');
const router = express.Router();
const axios = require('axios');
const NodeCache = require('node-cache');

// Cache untuk lyrics (expires setiap 7 hari)
const cache = new NodeCache({ stdTTL: 604800 });

const GENIUS_ACCESS_TOKEN = process.env.GENIUS_ACCESS_TOKEN;
const GENIUS_BASE_URL = 'https://api.genius.com';

/**
 * GET /api/lyrics/test
 * Test Genius API connection
 */
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Genius API route is working',
    token_exists: !!GENIUS_ACCESS_TOKEN,
    token_length: GENIUS_ACCESS_TOKEN ? GENIUS_ACCESS_TOKEN.length : 0,
    token_preview: GENIUS_ACCESS_TOKEN ? `${GENIUS_ACCESS_TOKEN.substring(0, 10)}...` : 'NOT FOUND'
  });
});

/**
 * GET /api/lyrics/search
 * Search for songs on Genius
 */
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Query parameter "q" is required'
      });
    }

    // Debug log
    console.log('Genius token exists:', !!GENIUS_ACCESS_TOKEN);
    console.log('Genius token length:', GENIUS_ACCESS_TOKEN ? GENIUS_ACCESS_TOKEN.length : 0);

    const response = await axios.get(`${GENIUS_BASE_URL}/search`, {
      params: { q },
      headers: {
        'Authorization': `Bearer ${GENIUS_ACCESS_TOKEN}`
      }
    });

    const hits = response.data.response.hits;

    if (hits.length === 0) {
      return res.json({
        success: true,
        data: [],
        message: 'No songs found'
      });
    }

    // Transform data
    const songs = hits.map(hit => ({
      id: hit.result.id,
      title: hit.result.title,
      artist: hit.result.primary_artist.name,
      artist_id: hit.result.primary_artist.id,
      url: hit.result.url,
      song_art_image_url: hit.result.song_art_image_url,
      header_image_url: hit.result.header_image_thumbnail_url
    }));

    res.json({
      success: true,
      data: songs
    });

  } catch (error) {
    console.error('Genius search error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to search songs',
      error: error.message
    });
  }
});

/**
 * GET /api/lyrics/song/:songId
 * Get song details from Genius
 */
router.get('/song/:songId', async (req, res) => {
  try {
    const { songId } = req.params;

    // Check cache
    const cacheKey = `song_${songId}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached, from_cache: true });
    }

    const response = await axios.get(`${GENIUS_BASE_URL}/songs/${songId}`, {
      headers: {
        'Authorization': `Bearer ${GENIUS_ACCESS_TOKEN}`
      }
    });

    const song = response.data.response.song;

    const songData = {
      id: song.id,
      title: song.title,
      artist: song.primary_artist.name,
      artist_id: song.primary_artist.id,
      album: song.album?.name || 'Unknown',
      release_date: song.release_date_for_display,
      song_art_image_url: song.song_art_image_url,
      header_image_url: song.header_image_url,
      url: song.url,
      description: song.description?.plain || '',
      // Note: Genius API tidak memberikan lyrics langsung di JSON
      // Lyrics harus di-scrape dari halaman web
      lyrics_state: song.lyrics_state,
      genius_url: song.url
    };

    // Cache result
    cache.set(cacheKey, songData);

    res.json({
      success: true,
      data: songData,
      from_cache: false,
      note: 'Full lyrics available at genius_url'
    });

  } catch (error) {
    console.error('Genius song error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to get song details',
      error: error.message
    });
  }
});

/**
 * GET /api/lyrics/artist/:artistId
 * Get artist info from Genius
 */
router.get('/artist/:artistId', async (req, res) => {
  try {
    const { artistId } = req.params;

    const response = await axios.get(`${GENIUS_BASE_URL}/artists/${artistId}`, {
      headers: {
        'Authorization': `Bearer ${GENIUS_ACCESS_TOKEN}`
      }
    });

    const artist = response.data.response.artist;

    res.json({
      success: true,
      data: {
        id: artist.id,
        name: artist.name,
        image_url: artist.image_url,
        header_image_url: artist.header_image_url,
        url: artist.url,
        followers_count: artist.followers_count,
        description: artist.description?.plain || ''
      }
    });

  } catch (error) {
    console.error('Genius artist error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to get artist info',
      error: error.message
    });
  }
});

module.exports = router;
