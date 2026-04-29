const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { requireAuth } = require('../middleware/auth');

router.post('/', requireAuth, async (req, res) => {
  const { artisan_id, rating, comment } = req.body;
  if (!artisan_id || !rating) return res.status(400).json({ error: 'artisan_id and rating required' });
  if (rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be 1-5' });

  const { data: existing } = await supabase.from('reviews').select('id')
    .eq('artisan_id', artisan_id).eq('customer_id', req.user.id).single();
  if (existing) return res.status(409).json({ error: 'Already reviewed' });

  const { data, error } = await supabase.from('reviews')
    .insert({ artisan_id, rating, comment, customer_id: req.user.id })
    .select('id,rating,comment,created_at,profiles(full_name,avatar_url)').single();
  if (error) return res.status(500).json({ error: 'Failed' });
  res.status(201).json({ review: data });
});

router.delete('/:id', requireAuth, async (req, res) => {
  await supabase.from('reviews').delete().eq('id', req.params.id).eq('customer_id', req.user.id);
  res.json({ success: true });
});

module.exports = router;