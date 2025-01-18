const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

const sendVerificationEmail = async (email, token) => {
  const verificationUrl = `http://localhost:3000/verify-email?token=${token}`;
  
  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to: email,
    subject: 'E-posta Adresinizi Doğrulayın',
    html: `
      <h1>Hoş Geldiniz!</h1>
      <p>E-posta adresinizi doğrulamak için aşağıdaki bağlantıya tıklayın:</p>
      <a href="${verificationUrl}">E-posta Adresimi Doğrula</a>
      <p>Bu bağlantı 24 saat geçerlidir.</p>
    `
  });
};

const sendPasswordResetEmail = async (email, token) => {
  const resetUrl = `http://localhost:3000/reset-password?token=${token}`;
  
  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to: email,
    subject: 'Şifre Sıfırlama',
    html: `
      <h1>Şifre Sıfırlama</h1>
      <p>Şifrenizi sıfırlamak için aşağıdaki bağlantıya tıklayın:</p>
      <a href="${resetUrl}">Şifremi Sıfırla</a>
      <p>Bu bağlantı 1 saat geçerlidir.</p>
    `
  });
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail
};
