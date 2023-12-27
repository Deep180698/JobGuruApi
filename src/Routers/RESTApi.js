const express = require('express')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken'); 
const router = new express.Router()
const Schema = require('../Model/Schema')
const multer = require('multer')

const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const fs = require('fs');


const Images = 'src/Images';

fs.mkdirSync(Images, { recursive: true });
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, Images);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname)
  }
});

var upload = multer({

  storage: storage,
  fileFilter: (req, file, cb) => {

    if (file.mimetype == "image/png" || file.mimetype == "image/jpg" || file.mimetype == "image/jpeg") {
      cb(null, true);
    } else {
      cb(null, false);
    }
  }
})

router.get('/field', async (req, res) => {
  try {
    const items = await Schema.fieldModelSchema.find();
    res.json(items);
  } catch (error) {
    console.error('Error retrieving items:', error);
    res.status(500).json({ error: 'Internal server error' });
  }


});
// router.post('/skills', async (req, res) => {
//   try {
//     const items = await Schema.skillsModelSchema.find();
//     res.json(items);
//   } catch (error) {
//     console.error('Error retrieving items:', error);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });



module.exports = router;