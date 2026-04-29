const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { requireAuth } = require('../middleware/auth');

router.get('/search', async (req, res) => {
  const { trade, city, lat, lng, radius = 50 } = req.query;
  try {
    const { data, error } = await supabase.rpc('search_artisans', {
      search_trade: trade || null, search_city: city || null,
      search_lat: lat ? parseFloat(lat) : null,
      search_lng: lng ? parseFloat(lng) : null,
      radius_km: parseFloat(radius), lim: 30
    });
    if (error) throw error;
    res.json({ artisans: data });
  } catch (e) {
    res.status(500).json({ error: 'Search failed' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { data: artisan, error } = await supabase
      .from('artisans').select('*, profiles(full_name,phone,avatar_url)')
      .eq('id', req.params.id).single();
    if (error || !artisan) return res.status(404).json({ error: 'Not found' });

    const { data: reviews } = await supabase
      .from('reviews').select('id,rating,comment,created_at,profiles(full_name,avatar_url)')
      .eq('artisan_id', req.params.id).order('created_at', { ascending: false }).limit(20);

    res.json({ artisan, reviews: reviews || [] });
  } catch (e) {
    res.status(500).json({ error: 'Failed' });
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  const { data: artisan } = await supabase.from('artisans').select('profile_id').eq('id', req.params.id).single();
  if (!artisan || artisan.profile_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

  const updates = { ...req.body };
  if (updates.lat && updates.lng) {
    updates.location = 'POINT(${updates.lng} ${updates.lat});
    delete updates.lat; delete updates.lng;
  }
  const { data, error } = await supabase.from('artisans').update(updates).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: 'Update failed' });
  res.json({ artisan: data });
});

router.patch('/:id/availability', requireAuth, async (req, res) => {
  const { data: artisan } = await supabase.from('artisans').select('profile_id,is_available').eq('id', req.params.id).single();
  if (!artisan || artisan.profile_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  const { data } = await supabase.from('artisans').update({ is_available: !artisan.is_available }).eq('id', req.params.id).select('is_available').single();
  res.json({ is_available: data.is_available });
});

module.exports = router;