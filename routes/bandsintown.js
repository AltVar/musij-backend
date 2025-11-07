const express = require('express');
const router = express.Router();
const axios = require('axios');
const NodeCache = require('node-cache');

// Cache untuk events data (expires setiap 6 jam)
const cache = new NodeCache({ stdTTL: 21600 });

const BANDSINTOWN_APP_ID = process.env.BANDSINTOWN_APP_ID || 'musij_platform';
const BANDSINTOWN_BASE_URL = 'https://rest.bandsintown.com';

/**
 * GET /api/events/artist/:artistName
 * Get upcoming events for an artist
 */
router.get('/artist/:artistName', async (req, res) => {
  try {
    const { artistName } = req.params;

    // Check cache
    const cacheKey = `events_${artistName.toLowerCase()}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached, from_cache: true });
    }

    const response = await axios.get(
      `${BANDSINTOWN_BASE_URL}/artists/${encodeURIComponent(artistName)}/events`,
      {
        params: {
          app_id: BANDSINTOWN_APP_ID
        }
      }
    );

    // Bandsintown returns array directly
    const events = response.data;

    if (!Array.isArray(events) || events.length === 0) {
      return res.json({
        success: true,
        data: [],
        message: 'No upcoming events found'
      });
    }

    // Transform data
    const transformedEvents = events.map(event => ({
      id: event.id,
      title: event.title || `${artistName} Live`,
      datetime: event.datetime,
      date: event.datetime.split('T')[0],
      time: event.datetime.split('T')[1]?.substring(0, 5) || '19:00',
      venue: {
        name: event.venue.name,
        city: event.venue.city,
        region: event.venue.region,
        country: event.venue.country,
        location: `${event.venue.city}, ${event.venue.country}`
      },
      lineup: event.lineup || [artistName],
      offers: event.offers || [],
      ticket_url: event.url || event.offers[0]?.url || '#',
      description: event.description || `Live concert at ${event.venue.name}`
    }));

    // Cache result
    cache.set(cacheKey, transformedEvents);

    res.json({
      success: true,
      data: transformedEvents,
      from_cache: false
    });

  } catch (error) {
    console.error('Bandsintown events error:', error.response?.data || error.message);
    
    // Jika artist tidak ditemukan, return empty array
    if (error.response?.status === 404) {
      return res.json({
        success: true,
        data: [],
        message: 'No events found for this artist'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to get events',
      error: error.message
    });
  }
});

/**
 * GET /api/events/artist/:artistName/info
 * Get artist info from Bandsintown
 */
router.get('/artist/:artistName/info', async (req, res) => {
  try {
    const { artistName } = req.params;

    const response = await axios.get(
      `${BANDSINTOWN_BASE_URL}/artists/${encodeURIComponent(artistName)}`,
      {
        params: {
          app_id: BANDSINTOWN_APP_ID
        }
      }
    );

    const artist = response.data;

    res.json({
      success: true,
      data: {
        name: artist.name,
        image_url: artist.image_url || artist.thumb_url,
        tracker_count: artist.tracker_count,
        upcoming_event_count: artist.upcoming_event_count,
        url: artist.url,
        facebook_page_url: artist.facebook_page_url
      }
    });

  } catch (error) {
    console.error('Bandsintown artist info error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to get artist info',
      error: error.message
    });
  }
});

module.exports = router;
