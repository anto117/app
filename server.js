require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB model
const Booking = mongoose.model('Booking', new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  datetime: String,
}));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Email transporter (Gmail SMTP)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,       // your Gmail address
    pass: process.env.EMAIL_PASS,       // your Gmail App Password (not real password)
  },
});

// POST: Book an appointment
app.post('/api/book', async (req, res) => {
  const { name, email, phone, datetime } = req.body;

  console.log('📥 Received form data:', req.body);

  // ✅ Validate input
  if (!name?.trim() || !datetime?.trim() || !/^\d{10}$/.test(phone)) {
    return res.status(400).json({ message: 'Name, valid phone, and Date/Time are required' });
  }

  // ✅ Check if time slot is already booked
  const existing = await Booking.findOne({ datetime });
  if (existing) {
    return res.status(409).json({ message: 'Time slot is already booked' });
  }

  // ✅ Save booking
  const booking = new Booking({ name, email, phone, datetime });
  await booking.save();

  // ✅ Send confirmation email (only if email is provided)
  if (email?.trim()) {
    try {
      await transporter.sendMail({
        from: `"Appointment Scheduler" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Your Appointment Confirmation',
        html: `
          <p>Hello ${name},</p>
          <p>Your appointment has been successfully booked.</p>
          <p><strong>Date & Time:</strong> ${datetime}</p>
          <p><strong>Phone:</strong> ${phone}</p>
          <p>Thank you!</p>
        `,
      });
      console.log(`📧 Confirmation email sent to ${email}`);
    } catch (error) {
      console.error('❌ Email send failed:', error);
    }
  }

  res.json({ message: 'Appointment booked successfully' });
});

// GET: All bookings for admin
app.get('/api/bookings', async (req, res) => {
  const bookings = await Booking.find().sort({ datetime: 1 });
  res.json(bookings);
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Backend running on http://localhost:${PORT}`));
