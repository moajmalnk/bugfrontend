import { useNavigate } from "react-router-dom";
import { BiWifiOff } from "react-icons/bi";
import { IoCallOutline } from "react-icons/io5";
import { MdOutlineMailOutline } from "react-icons/md";
import { GoGlobe } from "react-icons/go";
import { FaRegQuestionCircle } from "react-icons/fa";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

const NetworkError = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4">
      <div className="bg-white p-6 px-8 rounded-xl shadow-lg xs:w-[400px] w-[300px] flex flex-col items-center">
        {/* Network Error Icon */}
        <div className="w-20 h-20 mb-4 flex items-center justify-center bg-red-50 rounded-full">
          <BiWifiOff className="w-12 h-12 text-red-500" />
        </div>

        {/* Error Title */}
        <h1 className="text-xl font-bold text-gray-800 mb-2">Connection Lost</h1>

        {/* Error Description */}
        <p className="text-sm text-gray-600 text-center mb-6">
          We're having trouble connecting to the server. Please check your internet connection or try again later.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col xs:flex-row gap-3 w-full">
          <button
            onClick={() => navigate(`/${currentUser?.role || 'tester'}/projects`)}
            className="px-4 py-2 rounded-lg bg-gray-100 text-sm text-gray-700 font-medium 
            hover:bg-gray-200 transition-colors w-full xs:w-auto"
          >
            Back to Home
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-lg bg-blue-500 text-sm text-white font-medium 
            hover:bg-blue-600 transition-colors w-full xs:w-auto"
          >
            Refresh Page
          </button>
        </div>
      </div>

      {/* Support Icons Container */}
      <div className="relative w-[200px] flex justify-center">
        {/* Question Mark Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center shadow-lg hover:bg-blue-600 transition-all duration-300 ${
            isOpen ? "transform -translate-x-[80px]" : ""
          }`}
        >
          <FaRegQuestionCircle className="h-6 w-6 text-white" />
        </button>

        {/* Support Options */}
        <div
          className={`absolute left-[56px] flex gap-3 transition-all duration-300 ${
            isOpen
              ? "opacity-100 transform translate-x-0"
              : "opacity-0 transform -translate-x-8 pointer-events-none"
          }`}
        >
          {/* 📞 Phone */}
          <a
            href="tel:+1234567890"
            className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg hover:bg-gray-50 transition-colors"
            title="Call Support"
          >
            <IoCallOutline className="h-6 w-6 text-blue-500" />
          </a>

          {/* 📧 Email */}
          <a
            href="mailto:support@bugs.com"
            className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg hover:bg-gray-50 transition-colors"
            title="Email Support"
          >
            <MdOutlineMailOutline className="h-6 w-6 text-blue-500" />
          </a>

          {/* 🌐 Support */}
          <a
            href="https://support.bugs.com"
            target="_blank"
            rel="noopener noreferrer"
            className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg hover:bg-gray-50 transition-colors"
            title="Visit Support Site"
          >
            <GoGlobe className="h-6 w-6 text-blue-500" />
          </a>
        </div>
      </div>
    </div>
  );
};

export default NetworkError; 