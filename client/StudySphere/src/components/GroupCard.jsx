import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom"
import axios from "axios"
import { useSelector } from "react-redux";

const apiUrl = import.meta.env.VITE_API_URL

function GroupCard({name, description, _id, tags, category, leader }) {

    const navigate = useNavigate()
    const userData = useSelector((state) => state.auth.userData)

    const viewGroup = () => {
        navigate(`/c/${_id}`)
    }

    const handleDeletion = async() => {
        try {
            const groupToBeDeleted = await axios.delete(`${apiUrl}/api/v1/group/delete/${_id}`, {
               withCredentials: true 
            })

            if(!groupToBeDeleted) {
                throw new Error('Failed to delete group')
            }

            alert('Group has been deleted')
            navigate('/')

        } catch (error) {
            throw new Error(error?.message)
        }
    }

    return (
        <div 
        className="flex flex-col bg-gradient-to-r from-blue-300 to-blue-400 h-[18vw] w-[28vw] cursor-pointer rounded-2xl transform transition-transform duration-300 hover:scale-105 hover:shadow-2xl shadow-md p-4 overflow-hidden" 
        onClick={viewGroup}
      >
        {/* Delete button section */}
        <div className="flex justify-end h-8 mb-2">
          {
            userData.fullName === leader ? (
              <img
            src="https://www.shutterstock.com/image-vector/trash-bin-icon-vector-recycle-260nw-1909485802.jpg"
            className="h-6 w-6 rounded-full hover:shadow-md hover:shadow-red-400 transition-shadow duration-300"
            alt="delete"
            onClick={(e) => {
              e.stopPropagation(); // Prevent opening up the group while deleting
              handleDeletion();
            }}
          />
            ) : null
          }
        </div>
      
        {/* Main content section */}
        <div className="flex flex-col items-center flex-1 justify-center space-y-2">
          <h1 className="text-xl font-semibold text-gray-800 text-center px-3 overflow-hidden"
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                textOverflow: 'ellipsis'
              }}>
            {name}
          </h1>
          
          <div className="flex-1 flex flex-col justify-center space-y-2 w-full">
            <div className="text-sm text-gray-600 text-center">
              <span className="font-medium block mb-1">Description:</span>
              <p className="px-3 leading-relaxed overflow-hidden"
                 style={{
                   display: '-webkit-box',
                   WebkitLineClamp: 2,
                   WebkitBoxOrient: 'vertical',
                   textOverflow: 'ellipsis'
                 }}>
                {description || "No description available"}
              </p>
            </div>
            
            <div className="text-sm text-gray-600 text-center">
              <span className="font-medium block mb-1">Tags:</span>
              <p className="px-3 leading-relaxed overflow-hidden"
                 style={{
                   display: '-webkit-box',
                   WebkitLineClamp: 1,
                   WebkitBoxOrient: 'vertical',
                   textOverflow: 'ellipsis'
                 }}>
                {tags || "No tags"}
              </p>
            </div>
            
            <div className="text-sm text-gray-600 text-center">
              <span className="font-medium block mb-1">Category:</span>
              <p className="px-3 leading-relaxed overflow-hidden"
                 style={{
                   display: '-webkit-box',
                   WebkitLineClamp: 1,
                   WebkitBoxOrient: 'vertical',
                   textOverflow: 'ellipsis'
                 }}>
                {category || "Uncategorized"}
              </p>
            </div>
          </div>
        </div>
      
        {/* Footer section */}
        <div className="border-t pt-3 mt-2">
          <p className="text-sm text-gray-700 font-medium text-center px-3 overflow-hidden"
             style={{
               display: '-webkit-box',
               WebkitLineClamp: 1,
               WebkitBoxOrient: 'vertical',
               textOverflow: 'ellipsis'
             }}>
            Leader: {leader || "Unknown Leader"}
          </p>
        </div>
      </div>
      
    )
}

export default GroupCard