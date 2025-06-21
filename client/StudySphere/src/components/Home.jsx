import React from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Users, BookOpen, MessageCircle, Share2, Edit3, UserCheck } from "lucide-react";

const FeatureCard = ({ icon: Icon, title, description }) => (
  <div className="group p-6 bg-white rounded-xl shadow-lg transform transition-all duration-300 hover:scale-105 hover:shadow-xl">
    <div className="flex flex-col items-center text-center space-y-4">
      <div className="p-3 bg-blue-50 rounded-full group-hover:bg-blue-100 transition-colors duration-300">
        <Icon className="w-8 h-8 text-blue-600" />
      </div>
      <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
      <p className="text-gray-600 leading-relaxed">{description}</p>
    </div>
  </div>
);

function Home() {
  const userStatus = useSelector((state) => state.auth.status);
  const userData = useSelector((state) => state.auth.userData);
  console.log("User Status:", userStatus);
  console.log("User Data:", userData);
  
  const navigate = useNavigate();

  const features = [
    {
      icon: Users,
      title: "Create Study Groups",
      description: "Build your own study community focused on specific subjects or topics. Set goals, manage members, and track progress together."
    },
    {
      icon: BookOpen,
      title: "Join Groups",
      description: "Find and connect with like-minded learners. Our smart matching system helps you discover groups that align with your interests."
    },
    {
      icon: MessageCircle,
      title: "Group Chat",
      description: "Engage in real-time discussions with dedicated chat rooms for each group. Share insights and get instant feedback from peers."
    },
    {
      icon: Share2,
      title: "Resource Sharing",
      description: "Easily share and access educational materials. Upload documents, videos, and articles to create a comprehensive study library."
    },
    {
      icon: Edit3,
      title: "Digital Whiteboard",
      description: "Collaborate in real-time with our interactive whiteboard. Sketch ideas, solve problems, and export your work as PDF."
    },
    {
      icon: UserCheck,
      title: "Smart Partner Matching",
      description: "Find study partners based on your learning style, goals, and academic interests for more effective collaboration."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {userStatus ? (
        <div className="container mx-auto px-4 py-12">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Welcome back, <span className="text-blue-600">{userData.fullName}</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Continue your learning journey with our collaborative tools and community.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
            {features.map((feature, index) => (
              <FeatureCard key={index} {...feature} />
            ))}
          </div>

          <div className="flex flex-wrap justify-center gap-4">
            <button
              onClick={() => navigate("/joinGroups")}
              className="px-8 py-3 bg-blue-600 text-white rounded-full font-semibold hover:bg-blue-700 transform transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-200"
            >
              Find Groups
            </button>
            <button
              onClick={() => navigate("/group")}
              className="px-8 py-3 bg-green-600 text-white rounded-full font-semibold hover:bg-green-700 transform transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-green-200"
            >
              Create Group
            </button>
            <button
              onClick={() => navigate("/profile")}
              className="px-8 py-3 bg-purple-600 text-white rounded-full font-semibold hover:bg-purple-700 transform transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-purple-200"
            >
              Update Profile
            </button>
          </div>
        </div>
      ) : (
        <div className="container mx-auto px-4 py-12">
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Transform Your Study Experience
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              Join our community of learners and unlock the power of collaborative studying. 
              Find study partners, share resources, and achieve your academic goals together.
            </p>
            <button
              onClick={() => navigate("/login")}
              className="px-10 py-4 bg-blue-600 text-white text-lg rounded-full font-semibold hover:bg-blue-700 transform transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-200"
            >
              Get Started Today
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <FeatureCard key={index} {...feature} />
            ))}
          </div>

          <div className="mt-20 text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Ready to Excel in Your Studies?
            </h2>
            <button
              onClick={() => navigate("/login")}
              className="px-8 py-3 bg-green-600 text-white rounded-full font-semibold hover:bg-green-700 transform transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-green-200"
            >
              Join Now
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;