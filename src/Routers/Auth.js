// import express 
const express = require('express')

// import bcrypt for password encrypt
const bcrypt = require('bcrypt')

//  import jwt for genrate random token
const jwt = require('jsonwebtoken');

const router = new express.Router()

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
    user: 'dp19453@gmail.com',
    pass: 'wmst sorq ufqy kmri',
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

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized - Token not provided' });
  }

  jwt.verify(token, 'your-secret-key', (err, user) => {
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
   
    if (!newUser.checked) {
      return res.status(401).json({ error: 'User must be checked during signup.' });
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


    const createdUser = await newUser.save();
    const token = jwt.sign({ userId: createdUser._id }, 'your-secret-key', { expiresIn: '1h' });

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
    const token = jwt.sign({ userId: user._id }, 'your-secret-key', { expiresIn: '1h' });

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


  console.log("email", email);

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



  user.save()

  // Send reset email

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
  const { newPassword } = req.body;

  console.log(token);

  // const user = await Schema.UserModelSchema.find();
  // const user = await Schema.UserModelSchema.findOne({email :email});

  const user = await Schema.UserModelSchema.findOne({ resetToken: token });

  console.log(user);

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
router.put('/update-profile', authenticateToken, upload.single('profileImage'), async (req, res) => {

  const userId = req.user.userId; // Extracted from the token
  const updatedProfile = req.file;

  const userData = req.body

  console.log("req.body", req.body);
  // // Assuming user data is stored using the "_id" property
  const user = await Schema.UserModelSchema.findOne({ _id: userId });

  userData.email = user.userData.email

  userData.password = user.userData.password
  // console.log("userData",userData);
  // console.log("user",user);


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

// Create post
router.post('/create-post', upload.array('images'), authenticateToken, async (req, res) => {
  const { images, title, description, salary, jobType, skills, additionalNote, address } = req.body;

  console.log("User Data :: ==", req.user.userId);
  const user = await Schema.UserModelSchema.findOne({ '_id': req.user.userId });
  console.log(user.userData);
  if (!title || !description || !salary || !jobType || !skills || !address) {


    return res.status(401).json({ error: 'Incomplete data provided' });
  }

  const newPost = new Schema.PostModelSchema({
    images: req.files.map(file => ({
      name: 'src/Images/' + file.filename,
      data: file.buffer,
      contentType: file.mimetype,
    })),
    firstName: user.userData.firstName,
    lastName: user.userData.lastName,
    mobileNumber: user.userData.mobileNumber,
    profileImage: user.userData.profileImage,
    title,
    description,
    salary,
    jobType,
    isFavourite: false,
    skills,
    additionalNote,
    address,
  });

  try {
    const savedPost = await newPost.save();
    res.json({ message: 'Post created successfully', post: savedPost });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// get post
router.get('/getPost', authenticateToken, async (req, res) => {

  try {
    const userId = req.user.userId;
    console.log(userId);
    const favorite = await Schema.favoriteModelSchema.find()
    console.log('favorite', favorite);

    const filteredArray = favorite.filter(item => item.userId === userId);

    console.log(filteredArray);
    // db.products.find().sort({"created_at": 1})


    const post = await Schema.PostModelSchema.find().sort({ "createdAt": 1 })

    filteredArray.forEach(filterItem => {
      const correspondingPost = post.find(postItem => postItem._id.toString() === filterItem.postID);
      if (correspondingPost) {
        correspondingPost.isFavourite = true;
      }
    });
    res.send(post);

  } catch (error) {

    res.status(error);
  }
});
// get country
router.get('/country', async (req, res) => {

  try {
    res.send(country);
  } catch (error) {

    res.status(error);
  }
});

// postFavourite Api
router.post('/postFavourite', authenticateToken, async (req, res) => {

  const userId = req.user.userId;
  const { postID, isFavourite } = req.body
  const favorite = await Schema.favoriteModelSchema.findOne({ userId: userId, postID: postID })
  if (favorite == null) {
    const newUser = new Schema.favoriteModelSchema({
      userId: userId,
      postID: postID,

    });
    await newUser.save();
    res.json({ message: 'Post add as favorite successfully' });

  } else {
    const result = await Schema.favoriteModelSchema.deleteOne({
      userId: userId,
      postID: postID,

    });
    if (result.deletedCount === 1) {
      res.json({ message: 'Post removed in favorite successfully' });
    } else {
      res.json({ message: 'post not found' });
    }
  }
});
// get Favourite post
router.get('/getFavourite', authenticateToken, async (req, res) => {

  const userId = req.user.userId;
  const favorite = await Schema.favoriteModelSchema.find()

  const filteredArray = favorite.filter(item => item.userId === userId);

  const newArray = await Promise.all(
    filteredArray.map(async (i) => {
      const postData = await Schema.PostModelSchema.findOne({ _id: i.postID });

      if (postData) {
        return { ...postData.toObject(), isFavourite: true };
      } else {
        // Handle the case when postData is null, for example:
        return { isFavourite: false };
      }
    })
  );

  res.json({ message: 'post Data', data: newArray });
});

module.exports = router;