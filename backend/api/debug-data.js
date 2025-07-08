const mongoose = require('mongoose');
const User = require('../models/User');
const Organization = require('../models/Organization');
const Event = require('../models/Event');
const HourLog = require('../models/HourLog');

const connectDB = async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  }
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://foundly-olive.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    await connectDB();
    const users = await User.find({});
    const orgs = await Organization.find({});
    const events = await Event.find({});
    const hours = await HourLog.find({});
    res.json({
      users,
      organizations: orgs,
      events,
      hours
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
} 