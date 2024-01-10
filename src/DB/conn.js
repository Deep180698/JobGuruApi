const express = require('express')

const mongoose = require('mongoose');

// mongoose.connect("mongodb://localhost:27017/JobGuru?directConnection=true")

mongoose.connect('mongodb://127.0.0.1/JobGuru?directConnection=true')