const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../services/email');

const router = express.Router();

// Kayıt ol
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, studentId } = req.body;

    // E-posta kontrolü
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Bu e-posta adresi zaten kullanılıyor' });
    }

    // Doğrulama tokeni oluştur
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 saat

    // Kullanıcı oluştur
    const user = new User({
      name,
      email,
      password,
      role,
      studentId,
      verificationToken,
      verificationTokenExpires
    });

    await user.save();

    // Doğrulama e-postası gönder
    await sendVerificationEmail(email, verificationToken);

    res.status(201).json({ message: 'Kayıt başarılı. Lütfen e-posta adresinizi doğrulayın.' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// E-posta doğrulama
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;

    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Geçersiz veya süresi dolmuş token' });
    }

    user.isEmailVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();

    res.json({ message: 'E-posta adresi başarıyla doğrulandı' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Giriş yap
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Geçersiz e-posta veya şifre' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Geçersiz e-posta veya şifre' });
    }

    if (!user.isEmailVerified) {
      return res.status(401).json({ message: 'Lütfen önce e-posta adresinizi doğrulayın' });
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        studentId: user.studentId,
        balance: user.balance
      }
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Şifre sıfırlama isteği
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'Bu e-posta adresiyle kayıtlı kullanıcı bulunamadı' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 saat
    await user.save();

    await sendPasswordResetEmail(email, resetToken);

    res.json({ message: 'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Şifre sıfırlama
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Geçersiz veya süresi dolmuş token' });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: 'Şifreniz başarıyla güncellendi' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
