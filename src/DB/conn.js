const express = require('express')
require('dotenv').config();

const mongoose = require('mongoose');

// mongoose.connect("mongodb://localhost:27017/JobGuru")
mongoose.connect(process.env.DB_URL)

