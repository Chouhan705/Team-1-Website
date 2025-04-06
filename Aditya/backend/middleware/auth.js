const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');
const Hospital = require('../models/Hospital');

const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            throw new Error('Authentication required');
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        const hospital = await Hospital.findOne({ _id: decoded.id });

        if (!hospital) {
            throw new Error('Hospital not found');
        }

        req.token = token;
        req.hospital = hospital;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Please authenticate.' });
    }
};

module.exports = auth; 