const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const hospitalSchema = new mongoose.Schema({
    hospitalName: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    phone: {
        type: String,
        required: true,
        length: 10
    },
    address: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    licenseNumber: {
        type: String,
        required: true,
        unique: true
    },
    facilities: [{
        name: String,
        availability: Boolean,
        description: String
    }],
    specialties: [{
        name: String,
        doctorsCount: Number,
        availableTime: String
    }],
    emergencyCapacity: {
        totalBeds: Number,
        availableBeds: Number,
        icuBeds: {
            total: Number,
            available: Number
        },
        ventilators: {
            total: Number,
            available: Number
        }
    },
    location: {
        type: {
            type: String,
            default: 'Point'
        },
        coordinates: {
            type: [Number],
            default: [0, 0]
        }
    }
}, {
    timestamps: true
});

// Create index for location-based queries
hospitalSchema.index({ location: '2dsphere' });

// Hash password before saving
hospitalSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Method to compare password
hospitalSchema.methods.comparePassword = async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

const Hospital = mongoose.model('Hospital', hospitalSchema);
module.exports = Hospital; 