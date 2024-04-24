// import express 
const express = require('express')
const router = new express.Router()

// import bcrypt for password encrypt
const bcrypt = require('bcrypt')

//  import jwt for genrate random token
const jwt = require('jsonwebtoken');


// import schema fror fetch database
const Schema = require('../Model/Schema')


const country = require('../JSON/country.json')

// image store from backend
const multer = require('multer')
const bodyParser = require('body-parser');

// mail send 
const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Store Images
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

router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));


// Nodemailer setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  port: 465, // Use the appropriate port for your email service
  secure: true, // Use SSL/TLS
  auth: {
    user: process.env.UserID,
    pass: process.env.UserPassword,
  },
  logger: true, // Enable logging
  debug: true, // Show debug output
  secureConnection: false, // Set to false for TLS, true for SSL
  tls: {
    // Allowing self-signed certificates (remove this in production)
    rejectUnauthorized: false,
  },
});

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const mobileNumebrRegex = /^\d{10}$/; // Assuming a 10-digit mobile number format
//authenticateToken

// Middleware to extract and verify JWT token from the Authorization header
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization'];

  console.log(token);
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized - Token not provided' });
  }


  jwt.verify(token,process.env.SECRET_KEY, (err, user) => {
    console.log('Token Payload:', user);

    if (err) {
      return res.status(403).json({ error: 'Forbidden - Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Sign up User Api
router.post('/signup', upload.single('profileImage'), async (req, res) => {
  try {
    const { firstName, lastName, mobileNumber, countryCode, email, password, address, city, country, zipcode, DOB, province, checked } = req.body;

    // Validate email format
    if (!emailRegex.test(email)) {
      return res.status(401).json({ error: 'Invalid email format.' });
    }

    // Validate mobile number format
    if (!mobileNumebrRegex.test(String(mobileNumber))) {
      return res.status(401).json({ error: 'Invalid mobile number format.' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const userData = {
      firstName,
      lastName,
      mobileNumber,
      countryCode,
      email,
      password: hashedPassword,
      province,
      city,
      country,
      zipcode,
      address,
      DOB,
      profileImage: 'src/Images/' + req.file.filename,
    }
    const newUser = new Schema.UserModelSchema({
      userData: userData,
      resetToken: '',
      resetTokenExpires: new Date(),
      checked: checked || false,

    });

    if (!newUser.checked) {
      return res.status(401).json({ error: 'User must be checked during signup.' });
    }


    const createdUser = await newUser.save();
    const token = jwt.sign({ userId: createdUser._id }, process.env.SECRET_KEY);

    return res.status(200).json({ message: 'User signup successful.', token, data: createdUser, userId: createdUser._id });

  } catch (error) {
    console.log(error);
    if (error.code === 11000 || error.code === 11001) {
      // MongoDB duplicate key error

      res.status(401).json({ error: 'Mobile number or email must be unique.' });
    } else {
      // Other errors
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
});
// Login Api
router.post('/login', async (req, res) => {
  
  try {
    const { email, password } = req.body;

    const user = await Schema.UserModelSchema.findOne({ 'userData.email': email });

    // Check if the user exists
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials.' });

    }

    const password1 = user.userData.password;

    // // Compare the provided password with the hashed password in the database
    const isPasswordValid = await bcrypt.compare(password, password1);
    console.log(isPasswordValid);

    // // Check if the password is valid
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    // // Create a JWT token for authentication
    const token = jwt.sign({ userId: user._id }, process.env.SECRET_KEY);

    // // Update the user record with the JWT token
    await Schema.UserModelSchema.findByIdAndUpdate(user._id, { $set: { token } });

    return res.status(200).json({ message: 'User login successful.', token, data: user, userId: user._id });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
// Forgot Password endpoint
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  const user = await Schema.UserModelSchema.findOne({ email: email });

  console.log(user);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  // Generate a unique reset token
  const resetToken = crypto.randomBytes(20).toString('hex');
  const resetTokenExpires = Date.now() + 3600000; // Token expires in 1 hour

  // Update user data with reset token and expiration
  user.resetToken = resetToken;
  user.resetTokenExpires = resetTokenExpires;

  // const resetLink = await generateDynamicLink(resetToken);
  const mailOptions = {
    from: 'dp19453@gmail.com',
    to: email,
    subject: 'Password Reset',
    text: `Click the following link to reset your password: ${resetToken}`,

  };

  console.log("trasnspoter", transporter);
  transporter.sendMail(mailOptions, (error) => {
    if (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error sending reset email' });
    }
    return res.json({ message: 'Reset email sent successfully' });
  });
});

// Reset Password endpoint
router.post('/reset-password/:token', async (req, res) => {
  const { token } = req.params;
  const user = await Schema.UserModelSchema.findOne({ resetToken: token });
  if (!user) {
    return res.status(400).json({ message: 'Invalid or expired token' });
  }

  // Update user password and clear reset token data

  const hashedPassword = await bcrypt.hash('newly-hashed-password', 10);

  user.password = hashedPassword; // In a real app, you would hash the new password
  user.resetToken = null;
  user.resetTokenExpires = null;

  user.save()

  return res.json({ message: 'Password reset successful' });
});

// Profile details API
router.get('/profile', authenticateToken, async (req, res) => {

  try {

    const user = await Schema.UserModelSchema.findOne();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log("user Data", user);
    res.json(user.userData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
//Update-profile
router.post('/update-profile', authenticateToken, upload.single('profileImage'), async (req, res) => {

  console.log(req.body);
  const userId = req.user.userId; // Extracted from the token
  const updatedProfile = req.file;
  const userData = req.body
  const user = await Schema.UserModelSchema.findOne({ _id: userId });
  userData.email = user.userData.email
  userData.password = user.userData.password
  if (user) {
    user.userData = userData
    user.userData.profileImage = req.file === undefined ? req.body.profileImage : updatedProfile.destination + '/' + updatedProfile.filename

    console.log(user.userData);

    await user.save();
    res.json({ message: 'Profile updated successfully', userData: user.userData });
  } else {
    res.status(404).json({ error: 'User not found' });
  }
});
//check_user
router.post('/check_user', async (req, res) => {
  const { email } = req.body;
  const user = await Schema.UserModelSchema.findOne({ 'userData.email': email });

  if (user) {
    return res.status(401).json({ error: 'User already exists.' });
  } else {
    return res.json({ exists: false, message: 'Add user details' });
  }

});
//fields
router.get('/fields', async (req, res) => {

  try {
    const user = await Schema.fieldModelSchema.find()
    res.send(user);

  } catch (error) {

    res.status(error);
  }
});
//Users
router.get('/Users', async (req, res) => {
  try {
    const user = await Schema.signUpModelSchema.find()
    res.send(user);


  } catch (error) {
    res.send(error)
  }
})
// get country
router.get('/country', async (req, res) => {

  try {
    res.send(country);
  } catch (error) {

    res.status(error);
  }
});

module.exports = router;