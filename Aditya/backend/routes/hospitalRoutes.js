const express = require('express');
const jwt = require('jsonwebtoken');
const Hospital = require('../models/Hospital');
const auth = require('../middleware/auth');
const { JWT_SECRET } = require('../config');
const router = express.Router();

// Register hospital
router.post('/register', async (req, res) => {
    try {
        const hospital = new Hospital(req.body);
        await hospital.save();
        
        const token = jwt.sign({ id: hospital._id }, JWT_SECRET);
        res.status(201).json({ hospital, token });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Login hospital
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const hospital = await Hospital.findOne({ email });
        
        if (!hospital) {
            throw new Error('Invalid login credentials');
        }
        
        const isMatch = await hospital.comparePassword(password);
        if (!isMatch) {
            throw new Error('Invalid login credentials');
        }
        
        const token = jwt.sign({ id: hospital._id }, JWT_SECRET);
        res.json({ hospital, token });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Get hospital profile
router.get('/profile', auth, async (req, res) => {
    res.json(req.hospital);
});

// Update hospital profile
router.patch('/profile', auth, async (req, res) => {
    const updates = Object.keys(req.body);
    const allowedUpdates = ['hospitalName', 'phone', 'address', 'facilities', 'specialties', 'emergencyCapacity', 'location'];
    const isValidOperation = updates.every(update => allowedUpdates.includes(update));

    if (!isValidOperation) {
        return res.status(400).json({ error: 'Invalid updates!' });
    }

    try {
        updates.forEach(update => req.hospital[update] = req.body[update]);
        await req.hospital.save();
        res.json(req.hospital);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Update emergency capacity
router.patch('/emergency-capacity', auth, async (req, res) => {
    try {
        req.hospital.emergencyCapacity = {
            ...req.hospital.emergencyCapacity,
            ...req.body
        };
        await req.hospital.save();
        res.json(req.hospital.emergencyCapacity);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Add/Update facility
router.post('/facilities', auth, async (req, res) => {
    try {
        const facility = req.body;
        const existingIndex = req.hospital.facilities.findIndex(f => f.name === facility.name);
        
        if (existingIndex >= 0) {
            req.hospital.facilities[existingIndex] = facility;
        } else {
            req.hospital.facilities.push(facility);
        }
        
        await req.hospital.save();
        res.json(req.hospital.facilities);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Add/Update specialty
router.post('/specialties', auth, async (req, res) => {
    try {
        const specialty = req.body;
        const existingIndex = req.hospital.specialties.findIndex(s => s.name === specialty.name);
        
        if (existingIndex >= 0) {
            req.hospital.specialties[existingIndex] = specialty;
        } else {
            req.hospital.specialties.push(specialty);
        }
        
        await req.hospital.save();
        res.json(req.hospital.specialties);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Get nearby hospitals
router.get('/nearby', async (req, res) => {
    try {
        const { longitude, latitude, maxDistance = 10000 } = req.query;
        
        const hospitals = await Hospital.find({
            location: {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [parseFloat(longitude), parseFloat(latitude)]
                    },
                    $maxDistance: parseInt(maxDistance)
                }
            }
        }).select('-password');
        
        res.json(hospitals);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

module.exports = router; 