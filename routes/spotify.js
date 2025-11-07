const express = require('express');
const router = express.Router();
const axios = require('axios');
const NodeCache = require('node-cache');

// Cache untuk Spotify access token (expires setiap 1 jam)
const tokenCache = new NodeCache({ stdTTL: 3500 }); // 58 minutes

// Cache untuk track data (expires setiap 1 hari)
const trackCache = new NodeCache({ stdTTL: 86400 });

/**
 * Get Spotify Access Token
 */
async function getSpotifyToken() {
  // Check cache first
  const cachedToken = tokenCache.get('spotify_token');
  if (cachedToken) {
    return cachedToken;
  }

  try {
    const response = await axios.post(
      'https://accounts.spotify.com/api/token',
      'grant_type=client_credentials',
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + Buffer.from(
            process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET
          ).toString('base64')
        }
      }
    );

    const token = response.data.access_token;
    tokenCache.set('spotify_token', token);
    return token;

  } catch (error) {
    console.error('Spotify token error:', error.response?.data || error.message);
    throw new Error('Failed to get Spotify access token');
  }
}

/**
 * GET /api/music/search
 * Search untuk tracks
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

    const token = await getSpotifyToken();

    const response = await axios.get('https://api.spotify.com/v1/search', {
      params: {
        q: q,
        type: 'track',
        limit: limit,
        market: 'ID'
      },
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const tracks = response.data.tracks.items.map(track => ({
      id: track.id,
      name: track.name,
      artist: track.artists[0].name,
      album: track.album.name,
      duration_ms: track.duration_ms,
      preview_url: track.preview_url,
      image: track.album.images[0]?.url,
      spotify_url: track.external_urls.spotify
    }));

    res.json({
      success: true,
      data: tracks
    });

  } catch (error) {
    console.error('Spotify search error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to search tracks',
      error: error.message
    });
  }
});

/**
 * GET /api/music/track/:trackId
 * Get detail track by ID
 */
router.get('/track/:trackId', async (req, res) => {
  try {
    const { trackId } = req.params;

    // Check cache
    const cached = trackCache.get(`track_${trackId}`);
    if (cached) {
      return res.json({ success: true, data: cached, from_cache: true });
    }

    const token = await getSpotifyToken();

    const response = await axios.get(`https://api.spotify.com/v1/tracks/${trackId}`, {
      params: { market: 'ID' },
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const track = response.data;
    const trackData = {
      id: track.id,
      name: track.name,
      artist: track.artists[0].name,
      album: track.album.name,
      duration_ms: track.duration_ms,
      preview_url: track.preview_url,
      image: track.album.images[0]?.url,
      release_date: track.album.release_date,
      popularity: track.popularity,
      spotify_url: track.external_urls.spotify
    };

    // Cache the result
    trackCache.set(`track_${trackId}`, trackData);

    res.json({
      success: true,
      data: trackData,
      from_cache: false
    });

  } catch (error) {
    console.error('Spotify track error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to get track details',
      error: error.message
    });
  }
});

/**
 * GET /api/music/recommendations
 * Get recommendations based on seed tracks/artists
 */
router.get('/recommendations', async (req, res) => {
  try {
    const { seed_tracks, seed_artists, limit = 10 } = req.query;

    if (!seed_tracks && !seed_artists) {
      return res.status(400).json({
        success: false,
        message: 'At least one of seed_tracks or seed_artists is required'
      });
    }

    const token = await getSpotifyToken();

    const response = await axios.get('https://api.spotify.com/v1/recommendations', {
      params: {
        seed_tracks: seed_tracks,
        seed_artists: seed_artists,
        limit: limit,
        market: 'ID'
      },
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const tracks = response.data.tracks.map(track => ({
      id: track.id,
      name: track.name,
      artist: track.artists[0].name,
      album: track.album.name,
      duration_ms: track.duration_ms,
      preview_url: track.preview_url,
      image: track.album.images[0]?.url,
      spotify_url: track.external_urls.spotify
    }));

    res.json({
      success: true,
      data: tracks
    });

  } catch (error) {
    console.error('Spotify recommendations error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to get recommendations',
      error: error.message
    });
  }
});

/**
 * GET /api/music/artist/:artistId
 * Get artist info
 */
router.get('/artist/:artistId', async (req, res) => {
  try {
    const { artistId } = req.params;

    const token = await getSpotifyToken();

    const response = await axios.get(`https://api.spotify.com/v1/artists/${artistId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const artist = response.data;
    const artistData = {
      id: artist.id,
      name: artist.name,
      genres: artist.genres,
      popularity: artist.popularity,
      followers: artist.followers.total,
      image: artist.images[0]?.url,
      spotify_url: artist.external_urls.spotify
    };

    res.json({
      success: true,
      data: artistData
    });

  } catch (error) {
    console.error('Spotify artist error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to get artist info',
      error: error.message
    });
  }
});

/**
 * GET /api/music/artist/:artistId/top-tracks
 * Get artist top tracks
 */
router.get('/artist/:artistId/top-tracks', async (req, res) => {
  try {
    const { artistId } = req.params;

    const token = await getSpotifyToken();

    const response = await axios.get(`https://api.spotify.com/v1/artists/${artistId}/top-tracks`, {
      params: { market: 'ID' },
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const tracks = response.data.tracks.map(track => ({
      id: track.id,
      name: track.name,
      artist: track.artists[0].name,
      album: track.album.name,
      duration_ms: track.duration_ms,
      preview_url: track.preview_url,
      image: track.album.images[0]?.url,
      popularity: track.popularity,
      spotify_url: track.external_urls.spotify
    }));

    res.json({
      success: true,
      data: tracks
    });

  } catch (error) {
    console.error('Spotify top tracks error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to get top tracks',
      error: error.message
    });
  }
});

module.exports = router;
