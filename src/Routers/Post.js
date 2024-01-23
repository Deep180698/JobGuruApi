
// import express 
const express = require('express')

// import bcrypt for password encrypt
const bcrypt = require('bcrypt')

//  import jwt for genrate random token
const jwt = require('jsonwebtoken');

const router = new express.Router()

// import schema fror fetch database
const Schema = require('../Model/Schema')

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


// Middleware to extract and verify JWT token from the Authorization header
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization'];

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized - Token not provided' });
  }

  jwt.verify(token, process.env.SECRET_KEY, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Forbidden - Invalid token' });
    }
    req.user = user;
    next();
  });
};


// Create post
router.post('/create-post', upload.array('images'), authenticateToken, async (req, res) => {
  const { images, title, description, salary, jobType, skills, additionalNote, address } = req.body;


  if (!title || !description || !salary || !jobType || !skills || !address) {


    return res.status(401).json({ error: 'Incomplete data provided' });
  }
  const newPost = new Schema.PostModelSchema({
    images: req.files.map(file => ({
      name: 'src/Images/' + file.filename,
      data: file.buffer,
      contentType: file.mimetype,
    })),
    userId: req.user.userId,
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

    // Fetch favorites for the user
    const favorites = await Schema.favoriteModelSchema.find({ userId });

    console.log(userId);
    // Fetch all posts
    const posts = await Schema.PostModelSchema.find();

    // Fetch user data for each post
    const postsWithData = await Promise.all(
      posts.map(async (post) => {
        const userData = await Schema.UserModelSchema.findById(post.userId);
    
        if (post.userId !== userId) {
          return { ...post.toObject(),  UserData: userData.userData };
        }
      })
    );

    const filteredData = postsWithData.filter(data => data !== undefined);


    console.log(filteredData);
    // Update posts with favorite information
    favorites.forEach((favorite) => {
      const correspondingPost = filteredData.find(
        (post) => post._id.toString() === favorite.postID
      );
      if (correspondingPost) {
        correspondingPost.isFavourite = true;
      }
    });

    // Sort posts by createdAt in descending order
    const sortedPosts = filteredData.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );


    if (sortedPosts.length !== 0) {
      res.send(sortedPosts);
    } else {
      res.status(404).json({ error: 'No posts found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
// postFavourite Api
router.post('/postFavourite', authenticateToken, async (req, res) => {

  const { postID, isFavourite, UserID } = req.body;

  console.log(UserID);
  try {
    const favorite = await Schema.favoriteModelSchema.findOne({ userId: UserID, postID: postID }) || null;


    if (!favorite) {

      // If favorite is not found, add it
      const newFavorite = new Schema.favoriteModelSchema({
        userId: UserID,
        postID: postID,
      });
      await newFavorite.save();
      res.json({ message: 'Post added to favorites successfully' });
    } else {
      // If favorite exists, remove it
      const result = await Schema.favoriteModelSchema.deleteOne({
        userId: UserID,
        postID: postID,
      });

      if (result.deletedCount === 1) {
        res.json({ message: 'Post removed from favorites successfully' });
      } else {
        res.json({ message: 'Post not found in favorites' });
      }
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }

});
// get Favourite post
router.get('/getFavourite', authenticateToken, async (req, res) => {


  try {
    const userId = req.user.userId;
  
    // Fetch favorites for the user
    const favorites = await Schema.favoriteModelSchema.find({ userId });
  
    // Fetch all posts
    const posts = await Schema.PostModelSchema.find();
  
    // Fetch user data for each post
    const postsWithData = favorites.map((item) => ({ ...item.toObject() }));
  
  
    // Filter posts based on favorites
    const postData = posts.filter((item) => {
      const existsInPostsWithData = postsWithData.some((i) => (item._id).toString() === i.postID);
      return existsInPostsWithData;
    });
  
    console.log(postData);
  
    // Fetch user data for each post
    const postsWithData1 = await Promise.all(
      postData.map(async (post) => {
        const userData = await Schema.UserModelSchema.findById(post.userId);
        return {
          ...post.toObject(),
          isMypost: post.userId === userId,
          UserData: userData.userData,
        };
      })
    );
  
    console.log(postsWithData1);
  
    // Update posts with favorite information
    postsWithData1.forEach((post) => {
      const correspondingFavorite = favorites.find((favorite) => post._id.toString() === favorite.postID);
      if (correspondingFavorite) {
        post.isFavourite = true;
      }
    });
  
    // Sort posts by createdAt in descending order
    const sortedPosts = postsWithData1.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
    if (sortedPosts.length !== 0) {
      res.json({ message: 'Favourite Post', postData: sortedPosts });
    } else {
      res.status(404).json({ error: 'No posts found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
  

});

module.exports = router;