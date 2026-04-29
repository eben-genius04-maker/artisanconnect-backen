const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { requireAuth } = require('../middleware/auth');

router.get('/conversations', requireAuth, async (req, res) => {
  try {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', req.user.id).single();
    let query = supabase.from('conversations').select(
      id, last_message, last_msg_at,
      customer:profiles!customer_id(id,full_name,avatar_url),
      artisan:artisans!artisan_id(id,trade,profiles(full_name,avatar_url))
    ).order('last_msg_at', { ascending: false });

    if (profile?.role === 'customer') {
      query = query.eq('customer_id', req.user.id);
    } else {
      const { data: a } = await supabase.from('artisans').select('id').eq('profile_id', req.user.id).single();
      if (a) query = query.eq('artisan_id', a.id);
    }
    const { data } = await query;
    res.json({ conversations: data || [] });
  } catch (e) {
    res.status(500).json({ error: 'Failed' });
  }
});

router.get('/:id/messages', requireAuth, async (req, res) => {
  const { data } = await supabase.from('messages')
    .select('id,body,read,created_at,sender:profiles!sender_id(id,full_name,avatar_url)')
    .eq('conversation_id', req.params.id).order('created_at', { ascending: true }).limit(100);
  await supabase.from('messages').update({ read: true })
    .eq('conversation_id', req.params.id).neq('sender_id', req.user.id);
  res.json({ messages: data || [] });
});

router.post('/start', requireAuth, async (req, res) => {
  const { artisan_id } = req.body;
  if (!artisan_id) return res.status(400).json({ error: 'artisan_id required' });
  const { data: existing } = await supabase.from('conversations').select('id')
    .eq('customer_id', req.user.id).eq('artisan_id', artisan_id).single();
  if (existing) return res.json({ conversation_id: existing.id });
  const { data } = await supabase.from('conversations')