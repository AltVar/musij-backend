const express = require('express');
const router = express.Router();
const axios = require('axios');
const NodeCache = require('node-cache');

// Cache untuk artist data (expires setiap 1 hari)
const cache = new NodeCache({ stdTTL: 86400 });

const LASTFM_API_KEY = process.env.LASTFM_API_KEY;
const LASTFM_BASE_URL = 'http://ws.audioscrobbler.com/2.0/';

/**
 * GET /api/artists/info/:artistName
 * Get artist information
 */
router.get('/info/:artistName', async (req, res) => {
  try {
    const { artistName } = req.params;

    // Check cache
    const cacheKey = `artist_info_${artistName.toLowerCase()}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached, from_cache: true });
    }

    const response = await axios.get(LASTFM_BASE_URL, {
      params: {
        method: 'artist.getinfo',
        artist: artistName,
        api_key: LASTFM_API_KEY,
        format: 'json'
      }
    });

    if (response.data.error) {
      return res.status(404).json({
        success: false,
        message: response.data.message || 'Artist not found'
      });
    }

    const artist = response.data.artist;
    const artistData = {
      name: artist.name,
      listeners: parseInt(artist.stats.listeners),
      playcount: parseInt(artist.stats.playcount),
      bio: artist.bio.summary.replace(/<a[^>]*>.*?<\/a>/g, ''), // Remove HTML tags
      image: artist.image.find(img => img.size === 'extralarge')?.['#text'] || null,
      tags: artist.tags.tag.map(tag => tag.name),
      url: artist.url,
      similar: artist.similar?.artist?.slice(0, 5).map(a => ({
        name: a.name,
        url: a.url
      })) || []
    };

    // Cache result
    cache.set(cacheKey, artistData);

    res.json({
      success: true,
      data: artistData,
      from_cache: false
    });

  } catch (error) {
    console.error('Last.fm artist info error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to get artist info',
      error: error.message
    });
  }
});

/**
 * GET /api/artists/top-tracks/:artistName
 * Get artist top tracks
 */
router.get('/top-tracks/:artistName', async (req, res) => {
  try {
    const { artistName } = req.params;
    const { limit = 10 } = req.query;

    // Check cache
    const cacheKey = `artist_top_tracks_${artistName.toLowerCase()}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached, from_cache: true });
    }

    const response = await axios.get(LASTFM_BASE_URL, {
      params: {
        method: 'artist.gettoptracks',
        artist: artistName,
        api_key: LASTFM_API_KEY,
        limit: limit,
        format: 'json'
      }
    });

    if (response.data.error) {
      return res.status(404).json({
        success: false,
        message: response.data.message || 'Artist not found'
      });
    }

    const tracks = response.data.toptracks.track.map(track => ({
      name: track.name,
      playcount: parseInt(track.playcount),
      listeners: parseInt(track.listeners),
      artist: track.artist.name,
      url: track.url,
      image: track.image.find(img => img.size === 'large')?.['#text'] || null
    }));

    // Cache result
    cache.set(cacheKey, tracks);

    res.json({
      success: true,
      data: tracks,
      from_cache: false
    });

  } catch (error) {
    console.error('Last.fm top tracks error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to get top tracks',
      error: error.message
    });
  }
});

/**
 * GET /api/artists/similar/:artistName
 * Get similar artists
 */
router.get('/similar/:artistName', async (req, res) => {
  try {
    const { artistName } = req.params;
    const { limit = 10 } = req.query;

    // Check cache
    const cacheKey = `artist_similar_${artistName.toLowerCase()}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached, from_cache: true });
    }

    const response = await axios.get(LASTFM_BASE_URL, {
      params: {
        method: 'artist.getsimilar',
        artist: artistName,
        api_key: LASTFM_API_KEY,
        limit: limit,
        format: 'json'
      }
    });

    if (response.data.error) {
      return res.status(404).json({
        success: false,
        message: response.data.message || 'Artist not found'
      });
    }

    const artists = response.data.similarartists.artist.map(artist => ({
      name: artist.name,
      match: parseFloat(artist.match),
      url: artist.url,
      image: artist.image.find(img => img.size === 'large')?.['#text'] || null
    }));

    // Cache result
    cache.set(cacheKey, artists);

    res.json({
      success: true,
      data: artists,
      from_cache: false
    });

  } catch (error) {
    console.error('Last.fm similar artists error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to get similar artists',
      error: error.message
    });
  }
});

/**
 * GET /api/artists/search
 * Search artists
 */
router.get('/search', async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Query parameter "q" is required'
      });
    }

    const response = await axios.get(LASTFM_BASE_URL, {
      params: {
        method: 'artist.search',
        artist: q,
        api_key: LASTFM_API_KEY,
        limit: limit,
        format: 'json'
      }
    });

    const results = response.data.results;
    
    if (!results.artistmatches || !results.artistmatches.artist) {
      return res.json({
        success: true,
        data: []
      });
    }

    const artists = results.artistmatches.artist.map(artist => ({
      name: artist.name,
      listeners: parseInt(artist.listeners),
      url: artist.url,
      image: artist.image.find(img => img.size === 'large')?.['#text'] || null
    }));

    res.json({
      success: true,
      data: artists
    });

  } catch (error) {
    console.error('Last.fm search error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to search artists',
      error: error.message
    });
  }
});

/**
 * GET /api/artists/track-info
 * Get track info (alternative untuk lyrics placeholder)
 */
router.get('/track-info', async (req, res) => {
  try {
    const { artist, track } = req.query;

    if (!artist || !track) {
      return res.status(400).json({
        success: false,
        message: 'Both artist and track parameters are required'
      });
    }

    const response = await axios.get(LASTFM_BASE_URL, {
      params: {
        method: 'track.getInfo',
        artist: artist,
        track: track,
        api_key: LASTFM_API_KEY,
        format: 'json'
      }
    });

    if (response.data.error) {
      return res.status(404).json({
        success: false,
        message: response.data.message || 'Track not found'
      });
    }

    const trackData = response.data.track;
    const result = {
      name: trackData.name,
      artist: trackData.artist.name,
      album: trackData.album?.title || 'Unknown',
      duration: trackData.duration ? parseInt(trackData.duration) : null,
      listeners: parseInt(trackData.listeners),
      playcount: parseInt(trackData.playcount),
      tags: trackData.toptags?.tag?.map(tag => tag.name) || [],
      url: trackData.url,
      image: trackData.album?.image?.find(img => img.size === 'large')?.['#text'] || null
    };

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Last.fm track info error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to get track info',
      error: error.message
    });
  }
});

module.exports = router;
