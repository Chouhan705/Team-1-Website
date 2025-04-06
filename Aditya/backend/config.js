require('dotenv').config();

const config = {
    MONGODB_URI: process.env.MONGODB_URI || 'mongodb+srv://your_username:your_password@cluster0.mongodb.net/chetak',
    JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key',
    PORT: process.env.PORT || 5000
};

module.exports = config; 