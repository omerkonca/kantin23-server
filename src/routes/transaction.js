const express = require('express');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const Product = require('../models/Product');
const router = express.Router();

// Öğrencinin işlemlerini getir
router.get('/student/:studentId', async (req, res) => {
  try {
    const transactions = await Transaction.find({ student: req.params.studentId })
      .populate('product')
      .sort({ createdAt: -1 });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Yeni işlem oluştur
router.post('/process-payment', async (req, res) => {
  try {
    const { studentId, productId, quantity } = req.body;

    // Ürün ve öğrenci kontrolü
    const [product, student] = await Promise.all([
      Product.findById(productId),
      User.findById(studentId)
    ]);

    if (!product || !student) {
      return res.status(404).json({ message: 'Ürün veya öğrenci bulunamadı' });
    }

    // Stok kontrolü
    if (product.stock < quantity) {
      return res.status(400).json({ message: 'Yetersiz stok' });
    }

    // Bakiye kontrolü
    const totalPrice = product.price * quantity;
    if (student.balance < totalPrice) {
      return res.status(400).json({ message: 'Yetersiz bakiye' });
    }

    // İşlem oluştur
    const transaction = new Transaction({
      student: studentId,
      product: productId,
      quantity,
      totalPrice
    });

    // Stok ve bakiye güncelle
    product.stock -= quantity;
    student.balance -= totalPrice;

    await Promise.all([
      transaction.save(),
      product.save(),
      student.save()
    ]);

    res.status(201).json(transaction);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Satış raporu
router.get('/sales-report', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = {};

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const transactions = await Transaction.find(query)
      .populate('product')
      .populate('student', 'name studentId')
      .sort({ createdAt: -1 });

    const report = {
      totalSales: transactions.length,
      totalRevenue: transactions.reduce((sum, t) => sum + t.totalPrice, 0),
      transactions
    };

    res.json(report);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
