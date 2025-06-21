import React, { useState, useEffect } from "react";
import axios from "axios";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { updateUser } from "../store/Slice.js";
import { User, Mail, Book, Building, Loader2, Upload, X, Plus, Trash2, Clock, Calendar } from "lucide-react";

const apiUrl = import.meta.env.VITE_API_URL;

function Profile() {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [profilePic, setProfilePic] = useState(null);
    const [profilePicPreview, setProfilePicPreview] = useState(null);
    const [uploadLoading, setUploadLoading] = useState(false);
    const [skills, setSkills] = useState([]);
    const [newSkill, setNewSkill] = useState("");
    const [availabilityStatus, setAvailabilityStatus] = useState("available");
    const [customAvailability, setCustomAvailability] = useState("");
    const [showCustomField, setShowCustomField] = useState(false);
    const { register, handleSubmit, setValue } = useForm();
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const user = useSelector((state) => state.auth.userData);
    const userid = user._id;
    useEffect(() => {
        setValue("fullName", user.fullName || "");
        setValue("email", user.email || "");
        setValue("collegeName", user.collegeName || "");
        setValue("branch", user.branch || "");
        // Set profile picture if exists
        if (user.profilePic) {
            setProfilePicPreview(user.profilePic);
        }
        
        // Set skills if exists
        if (user.skills && Array.isArray(user.skills)) {
            setSkills(user.skills);
        }
        
        // Set availability if exists
        if (user.availabilityStatus) {
            setAvailabilityStatus(user.availabilityStatus);
            // Check if custom availability
            if (user.availabilityStatus === "custom" && user.customAvailability) {
                setCustomAvailability(user.customAvailability);
                setShowCustomField(true);
            }
        }
    }, [setValue, user]);

    const handleProfilePicChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setProfilePic(file);
            setProfilePicPreview(URL.createObjectURL(file));
        }
    };

    const handleAddSkill = () => {
        if (newSkill.trim() && !skills.includes(newSkill.trim())) {
            setSkills([...skills, newSkill.trim()]);
            setNewSkill("");
        }
    };

    const handleRemoveSkill = (skillToRemove) => {
        setSkills(skills.filter(skill => skill !== skillToRemove));
    };

    const handleAvailabilityChange = (e) => {
        const value = e.target.value;
        setAvailabilityStatus(value);
        setShowCustomField(value === "custom");
    };

    const uploadProfilePic = async () => {
        if (!profilePic) return null;
        
        setUploadLoading(true);
        const formData = new FormData();
        formData.append("profilePicture", profilePic);
        
        try {
            const response = await axios.post(
                `${apiUrl}/api/v1/users/upload-profile-picture/`,
                formData,
            );
            setUploadLoading(false);
            return response.data.imageUrl;
        } catch (error) {
            console.error("Error uploading profile picture:", error);
            setUploadLoading(false);
            return null;
        }
    };

    const submit = async (data) => {
        setLoading(true);
        try {
            // Upload profile picture if changed
            let profilePicUrl = profilePicPreview;
            if (profilePic) {
                profilePicUrl = await uploadProfilePic();
                console.log("Profile pic URL:", profilePicUrl);
            }
            
            // Add skills and availability to the data object
            const updatedData = {
                ...data,
                skills,
                profilePicture: profilePicUrl,
                availabilityStatus,
                customAvailability: availabilityStatus === "custom" ? customAvailability : ""
            };
            
            console.log("Data is:", updatedData);
            const response = await axios.put(
                `${apiUrl}/api/v1/users/update-profile/${userid}`, // userId is in the URL
                updatedData,
                {

                }
            );            

            dispatch(updateUser(response.data.data));
            setMessage("Profile updated successfully!");
            navigate("/");
        } catch (error) {
            console.error("Error updating profile:", error);
            setMessage("Error updating profile. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    // Get the appropriate availability badge color
    const getAvailabilityColor = () => {
        switch(availabilityStatus) {
            case "available":
                return "bg-green-100 text-green-800";
            case "busy":
                return "bg-red-100 text-red-800";
            case "away":
                return "bg-yellow-100 text-yellow-800";
            case "custom":
                return "bg-purple-100 text-purple-800";
            default:
                return "bg-gray-100 text-gray-800";
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-6">
            <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-3xl shadow-2xl p-8 transform transition-all duration-500 hover:scale-[1.01]">
                    <h2 className="text-3xl font-bold text-center text-gray-800 mb-8 animate-fadeIn">
                        Update Your Profile
                    </h2>

                    <div className="flex justify-center mb-8">
                        <div className="relative">
                            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-purple-500 shadow-lg transition-all duration-300 hover:shadow-xl hover:border-blue-500">
                                {profilePicPreview ? (
                                    <img 
                                        src={profilePicPreview} 
                                        alt="Profile" 
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                        <User className="w-16 h-16 text-gray-400" />
                                    </div>
                                )}
                            </div>
                            <label htmlFor="profile-pic" className="absolute bottom-0 right-0 bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-full cursor-pointer shadow-md transition-all duration-300 hover:shadow-lg">
                                <Upload className="w-4 h-4" />
                                <input 
                                    type="file" 
                                    id="profile-pic" 
                                    accept="image/*" 
                                    className="hidden" 
                                    onChange={handleProfilePicChange}
                                />
                            </label>
                            {uploadLoading && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full">
                                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                                </div>
                            )}
                            
                            {/* Availability badge */}
                            <div className={`absolute top-0 right-0 px-3 py-1 rounded-full text-sm font-medium shadow-md animate-fadeIn ${getAvailabilityColor()}`}>
                                {availabilityStatus === "custom" ? customAvailability || "Custom" : 
                                 availabilityStatus.charAt(0).toUpperCase() + availabilityStatus.slice(1)}
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit(submit)} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="transform transition-all duration-300 hover:translate-y-[-4px]">
                                <label className="block text-gray-700 font-semibold mb-2">
                                    Full Name
                                </label>
                                <div className="relative">
                                    <User className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                                    <input
                                        type="text"
                                        placeholder="Enter your full name"
                                        className="pl-10 w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 transition-all duration-300"
                                        {...register("fullName")}
                                    />
                                </div>
                            </div>

                            <div className="transform transition-all duration-300 hover:translate-y-[-4px]">
                                <label className="block text-gray-700 font-semibold mb-2">
                                    Email
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                                    <input
                                        type="email"
                                        placeholder="Enter your email"
                                        className="pl-10 w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 transition-all duration-300"
                                        {...register("email")}
                                    />
                                </div>
                            </div>

                            <div className="transform transition-all duration-300 hover:translate-y-[-4px]">
                                <label className="block text-gray-700 font-semibold mb-2">
                                    College Name
                                </label>
                                <div className="relative">
                                    <Building className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                                    <input
                                        type="text"
                                        placeholder="Enter your college name"
                                        className="pl-10 w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 transition-all duration-300"
                                        {...register("collegeName")}
                                    />
                                </div>
                            </div>

                            <div className="transform transition-all duration-300 hover:translate-y-[-4px]">
                                <label className="block text-gray-700 font-semibold mb-2">
                                    Branch
                                </label>
                                <div className="relative">
                                    <Book className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                                    <input
                                        type="text"
                                        placeholder="Enter your branch"
                                        className="pl-10 w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 transition-all duration-300"
                                        {...register("branch")}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Availability section */}
                        <div className="transform transition-all duration-300 hover:translate-y-[-4px]">
                            <label className="block text-gray-700 font-semibold mb-2">
                                Availability Status
                            </label>
                            <div className="relative">
                                <Clock className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                                <select
                                    value={availabilityStatus}
                                    onChange={handleAvailabilityChange}
                                    className="pl-10 w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 transition-all duration-300"
                                >
                                    <option value="available">Available</option>
                                    <option value="busy">Busy</option>
                                    <option value="away">Away</option>
                                </select>
                            </div>
                            
                            {showCustomField && (
                                <div className="mt-4 relative animate-fadeIn">
                                    <Calendar className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                                    <input
                                        type="text"
                                        value={customAvailability}
                                        onChange={(e) => setCustomAvailability(e.target.value)}
                                        placeholder="E.g. Available on weekends, Available after 5 PM"
                                        className="pl-10 w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 transition-all duration-300"
                                    />
                                </div>
                            )}
                        </div>

                        <div className="transform transition-all duration-300 hover:translate-y-[-4px]">
                            <label className="block text-gray-700 font-semibold mb-2">
                                Skills
                            </label>
                            <div className="flex flex-wrap gap-2 mb-3">
                                {skills.map((skill, index) => (
                                    <div 
                                        key={index} 
                                        className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full flex items-center gap-1 animate-fadeIn transition-all duration-300 hover:bg-blue-200"
                                    >
                                        <span>{skill}</span>
                                        <button 
                                            type="button" 
                                            onClick={() => handleRemoveSkill(skill)}
                                            className="text-blue-600 hover:text-red-600 transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <input
                                        type="text"
                                        value={newSkill}
                                        onChange={(e) => setNewSkill(e.target.value)}
                                        placeholder="Add a skill (e.g., JavaScript, React, Node.js)"
                                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 transition-all duration-300"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleAddSkill();
                                            }
                                        }}
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={handleAddSkill}
                                    className="bg-green-500 text-white p-2 rounded-lg hover:bg-green-600 transition-colors"
                                >
                                    <Plus className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {message && (
                            <div
                                className={`p-4 rounded-lg text-center font-semibold animate-fadeIn ${
                                    message.includes("Error")
                                        ? "bg-red-100 text-red-700"
                                        : "bg-green-100 text-green-700"
                                }`}
                            >
                                {message}
                            </div>
                        )}

                        <div className="flex justify-center pt-6">
                            <button
                                type="submit"
                                disabled={loading || uploadLoading}
                                className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white px-8 py-3 rounded-full font-semibold shadow-lg hover:scale-105 hover:shadow-xl transition-all duration-300 animate-pulse-subtle"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span>Updating...</span>
                                    </>
                                ) : (
                                    <span>Save Changes</span>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

// CSS for custom animations
const styles = `
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes pulseSubtle {
  0% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4); }
  70% { box-shadow: 0 0 0 10px rgba(99, 102, 241, 0); }
  100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0); }
}

.animate-fadeIn {
  animation: fadeIn 0.5s ease-in-out;
}

.animate-pulse-subtle {
  animation: pulseSubtle 2s infinite;
}
`;

// Add styles to document head
const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = styles;
document.head.appendChild(styleSheet);

export default Profile;