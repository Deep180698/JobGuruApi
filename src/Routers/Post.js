
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
  
    jwt.verify(token, 'your-secret-key', (err, user) => {
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
  
      // Fetch all posts
      const posts = await Schema.PostModelSchema.find();
  
      // Fetch user data for each post
      const postsWithData = await Promise.all(
        posts.map(async (post) => {
          const userData = await Schema.UserModelSchema.findById(post.userId);
  
          if(post.userId === userId){
          return  { ...post.toObject(),isMypost : true, UserData: userData.userData }
          }
          return { ...post.toObject(), UserData: userData.userData };
        })
      );
  
      // Update posts with favorite information
      favorites.forEach((favorite) => {
        const correspondingPost = postsWithData.find(
          (post) => post._id.toString() === favorite.postID
        );
        if (correspondingPost) {
          correspondingPost.isFavourite = true;
        }
      });
  
      // Sort posts by createdAt in descending order
      const sortedPosts = postsWithData.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
  
      console.log("sortedPosts", sortedPosts);
  
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
  
  
    try {
      const userId = req.user.userId;
  
      // Fetch favorites for the user
      const favorites = await Schema.favoriteModelSchema.find({ userId });
  
      // Fetch all posts
      const posts = await Schema.PostModelSchema.find();
  
      // Fetch user data for each post
      const postsWithData = await Promise.all(
        posts.map(async (post) => {
          if(post.userId === userId){
            const userData = await Schema.UserModelSchema.findById(post.userId);
  
          return  { ...post.toObject(),isMypost : true, UserData: userData.userData }
            
          }
          
        })
      );
  
      // Update posts with favorite information
      favorites.forEach((favorite) => {
        const correspondingPost = postsWithData.find(
          (post) => post._id.toString() === favorite.postID
        );
        if (correspondingPost) {
          correspondingPost.isFavourite = true;
        }
      });
  
      // Sort posts by createdAt in descending order
      const sortedPosts = postsWithData.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
  
      console.log("sortedPosts", sortedPosts);
  
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
  
  module.exports = router;