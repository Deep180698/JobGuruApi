const mongoose = require('mongoose')
const field = require('../JSON/field.json')

const UserSchema = new mongoose.Schema({
  userData: {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    countryCode: String,
    mobileNumber:  String,
    email:String,
    password: String,
    address: String,
    DOB: String,
    city: String,
    country: String,
    province: String,
    city: String,
    zipcode: String,
    profileImage: String,
  },
  token: String, // Add this line to include the token field
  checked: { type: Boolean, default: false },
  resetToken: String,
  resetTokenExpires: Date,
})

const fieldSchema = new mongoose.Schema({
  typeName: String,
  icon: String,
  isShow: Boolean,
});
const SkillsSchema = new mongoose.Schema({
  skillsName: String,
  isSelect: Boolean,
});
const postSchema = new mongoose.Schema({
  images: [
    {
      name: String,
      data: Buffer,
      contentType: String,
    },
  ],
  firstName: String,
  lastName: String,
  mobileNumber: String,
  profileImage: String,
  title: String,
  description: String,
  salary: String,
  jobType: String,
  skills: String,
  additionalNote: String,
  address: String,
  isFavourite: Boolean,

  createdAt: { type: Date, default: Date.now() }
});



const loginSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: String
});
const favoriteSchema = new mongoose.Schema({
  userId: String,
  postID: String
});

const fieldModel = mongoose.model("Fields", fieldSchema)
const skillsModel = mongoose.model("Skills", SkillsSchema)
const postModel = mongoose.model("posts", postSchema)
const favoriteModel = mongoose.model("postFavorites", favoriteSchema)

// fieldModel.insertMany(field)
//   .then(() => console.log('Items inserted successfully'))
//   .catch((err) => console.error('Error inserting items:', err));
const userModel = mongoose.model("Users", UserSchema)

module.exports = {
  skillsModelSchema: skillsModel,
  fieldModelSchema: fieldModel,
  UserModelSchema: userModel,
  PostModelSchema: postModel,
  favoriteModelSchema: favoriteModel,
};