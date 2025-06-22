import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom"

function GroupCard2({name, description, tags, category, leader, id }) {

  const navigate = useNavigate()

  const viewGroup = async () => {
      try {
        navigate(`join/${id}`)
      } catch (error) {
        
      }
  }

    return (
        <div 
        className="flex flex-col bg-gradient-to-r from-blue-300 to-blue-400 h-[18vw] w-[28vw] cursor-pointer rounded-2xl transform transition-transform duration-300 hover:scale-105 hover:shadow-2xl shadow-md p-4 overflow-hidden"
        onClick={viewGroup} 
      >
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

export default GroupCard2