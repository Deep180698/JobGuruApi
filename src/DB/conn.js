const express = require('express')

const mongoose = require('mongoose');

mongoose.connect("mongodb://jobguruapi.onrender.com:27017/JobGuru?directConnection=true")
// mongoose.connect("mongodb://localhost:27017/JobGuru?directConnection=true")

