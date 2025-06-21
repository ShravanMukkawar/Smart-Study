import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema = new mongoose.Schema(
    {
        fullName: {
            type: String,
            required: true,
            trim: true,
        },
        username: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            index: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            index: true,
        },
        password: {
            type: String,
            required: true,
            minLength: 6,
            trim: true,
        },
        profilePic: {
            type: String,
            default: "https://w0.peakpx.com/wallpaper/93/538/HD-wallpaper-cartoon-brown-bear-cartoon-brown-bear-png-cliparts-on-clipart-library-thumbnail.jpg",
        },
        bio: {
            type: String,
            default: "",
            trim: true,
        },
        collegeName: {
            type: String,
            trim: true,
        },
        branch: {
            type: String,
            trim: true,
        },
        skills: {
            type: [String], 
            default: [],
        },
        availabilityStatus: {
            type: String,
            enum: ["available", "busy", "away", "custom"],
            default: "available",
        },
        customStatusMessage: {
            type: String,
            trim: true,
            default: "",
        },
        createdAt: {
            type: Date,
            default: Date.now,
        },
        groups: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Group",
            },
        ],
        whiteboard: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "WhiteBoard",
        },
        refreshToken: {
            type: String,
        },
    },
    {
        timestamps: true,
    }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

// Password validation method
userSchema.methods.isPasswordCorrect = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Generate access token
userSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            username: this.username,
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
        }
    );
};

// Generate refresh token
userSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        {
            _id: this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
        }
    );
};

export const User = mongoose.model("User", userSchema);
