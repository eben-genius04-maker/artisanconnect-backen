const express = require('express');
const router = express.Router();
const Joi = require('joi');
const supabase = require('../config/supabase');
const { requireAuth } = require('../middleware/auth');

router.post('/register', async (req, res) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    full_name: Joi.string().required(),
    phone: Joi.string().required(),
    role: Joi.string().valid('customer','artisan').required(),
    trade: Joi.when('role', { is: 'artisan', then: Joi.string().required() }),
    city: Joi.when('role', { is: 'artisan', then: Joi.string().required() }),
    bio: Joi.string().optional(),
    years_exp: Joi.number().integer().min(0).optional(),
    skills: Joi.array().items(Joi.string()).optional()
  });
  const { error: vErr, value } = schema.validate(req.body);
  if (vErr) return res.status(400).json({ error: vErr.message });

  try {
    const { data: auth, error: aErr } = await supabase.auth.admin.createUser({
      email: value.email, password: value.password, email_confirm: true
    });
    if (aErr) return res.status(400).json({ error: aErr.message });

    await supabase.from('profiles').insert({
      id: auth.user.id, full_name: value.full_name, phone: value.phone, role: value.role
    });

    if (value.role === 'artisan') {
      await supabase.from('artisans').insert({
        profile_id: auth.user.id, trade: value.trade, city: value.city,
        bio: value.bio || null, years_exp: value.years_exp || 0, skills: value.skills || []
      });
    }
    res.status(201).json({ message: 'Registration successful' });
  } catch (e) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return res.status(401).json({ error: 'Invalid credentials' });

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
  let artisan = null;
  if (profile?.role === 'artisan') {
    const { data: a } = await supabase.from('artisans').select('*').eq('profile_id', data.user.id).single();
    artisan = a;
  }
  res.json({ token: data.session.access_token, user: { ...profile, artisan } });
});

router.get('/me', requireAuth, async (req, res) => {
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', req.user.id).single();
  let artisan = null;
  if (profile?.role === 'artisan') {
    const { data: a } = await supabase.from('artisans').select('*').eq('profile_id', req.user.id).single();
    artisan = a;
  }
  res.json({ user: { ...profile, artisan } });
});

module.exports = router;