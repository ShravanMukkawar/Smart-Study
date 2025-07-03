"use client"

import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useForm } from "react-hook-form"
import { useSelector, useDispatch } from "react-redux"
import axios from "axios"
import { motion, AnimatePresence } from "framer-motion"
import { Comment } from "react-loader-spinner"
import { Users, FileText, ClapperboardIcon as Whiteboard, Plus, X, LogOut, Trash2, MessageCircle } from "lucide-react"
import ChatBot from "./ChatBot";
import { delGroup } from "../store/Slice.js"
import Member from "./Member.jsx"
import Input from "./Input.jsx"
import Resources from "./Resources.jsx"
import ChatComponent from "./Chat.jsx"

const apiUrl = import.meta.env.VITE_API_URL

function Group() {
  const [mem, setMem] = useState(true)
  const [res, setRes] = useState(false)
  const [showBot, setShowBot] = useState(false) // Add this state
  const { register, handleSubmit, reset } = useForm()
  const [isOpen, setIsOpen] = useState(false)
  const [isRes, setIsRes] = useState(false)
  const userData = useSelector((state) => state.auth.userData)
  const [loading, setLoading] = useState(false)
  const [chatMinimized, setChatMinimized] = useState(false);

  const [members, setMembers] = useState([])
  const [resources, setResources] = useState([])
  const [userID, setUserID] = useState("")
  const [username, setUsername] = useState("")
  const [leader, setLeader] = useState("")
  const userId = useParams() // userId is the object which holds groupId
  const navigate = useNavigate()
  const dispatch = useDispatch()

  const openForm = () => {
    setIsOpen(true)
    reset()
  }

  const closeForm = () => {
    setIsOpen(false)
  }

  const openRes = () => {
    setIsRes(true)
    reset()
  }

  const closeRes = () => {
    setIsRes(false)
  }

  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true)
      try {
        const newId = userId.groupId
        const memberData = await axios.get(`${apiUrl}/api/v1/group/c/${newId}`, {
          withCredentials: true,
        })
        const resourceData = await axios.get(`${apiUrl}/api/v1/resource/getResource/${newId}`, {
          withCredentials: true,
        })
        const userData = await axios.get(`${apiUrl}/api/v1/users/getUser`, {
          withCredentials: true,
        })

        if (!memberData || !userData) throw new Error("Failed to fetch data")

        setLeader(memberData.data.data.group.leader.fullName)
        setUserID(userData.data.data._id)
        setUsername(userData.data.data.username)
        setMembers(memberData.data.data.member)
        setResources(resourceData.data.data)
      } catch (error) {
        console.error("Error fetching data:", error.message)
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [userId.groupId])

  // Methods to toggle between various headers
  const handleMem = () => {
    setRes(false)
    setMem(true)
  }

  const handlechat = () => {
    setShowBot((prev) => !prev);
  };

  const handleRes = () => {
    setRes(true)
    setMem(false)
  }

  const deleteGroup = async () => {
    if (!confirm("Are you sure you want to delete this group?")) return

    setLoading(true)
    try {
      const groupId = userId.groupId

      const group = await axios.delete(`${apiUrl}/api/v1/group/delete/${groupId}`, {
        withCredentials: true,
      })

      if (!group) {
        throw new Error("Failed to delete group")
      }

      dispatch(delGroup(group.data.data._id))
      alert("Group deleted successfully!!")
      navigate("/group")
    } catch (error) {
      console.log(error.message)
    } finally {
      setLoading(false)
    }
  }

  const addMember = async (data) => {
    setLoading(true)
    try {
      const addMem = await axios.post(`${apiUrl}/api/v1/group/add/${userId.groupId}`, data, {
        withCredentials: true,
      })

      if (!addMem) {
        throw new Error("Request failed to add members")
      }

      setMembers([...members, addMem.data.data])
      setIsOpen(false)
      reset()
    } catch (error) {
      alert("Cannot add User to this group")
      console.log(error.message)
    } finally {
      setLoading(false)
    }
  }

  const leaveGroup = async () => {
    if (!confirm("Are you sure you want to leave this group?")) return

    try {
      setLoading(true)
      const group = await axios.put(
        `${apiUrl}/api/v1/group/leave/${userId.groupId}`,
        {},
        {
          withCredentials: true,
        },
      )

      if (!group) {
        throw new Error(400, "No group found ")
      }

      dispatch(delGroup(group.data.data._id))
      alert("You have left the group")

      navigate("/group")
    } catch (error) {
      console.log(error)
    } finally {
      setLoading(false)
    }
  }

  const addResource = async (data) => {
    setLoading(true)
    try {
      const formData = new FormData()

      formData.append("title", data.title)
      console.log("url",data.url[0])
      formData.append("file", data.url[0])
      formData.append("description", data.description)
      
      const liveResource = await axios.post(`${apiUrl}/api/v1/resource/addResource/${userId.groupId}`, formData, {
        withCredentials: true,
      })

      if (!liveResource) {
        throw new Error("Failed to request resource")
      }

      setIsRes(false)
      setResources(liveResource.data.data)
      reset()
    } catch (error) {
      console.log(error)
      alert("Failed to add resource")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex justify-around min-h-[calc(100vh-5vw)] bg-gradient-to-r from-slate-100 to-blue-50 p-6">
      {loading && (
        <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-30 z-50">
          <Comment
            visible={true}
            height="80"
            width="80"
            color="#3B82F6"
            backgroundColor="#F8FAFC"
            ariaLabel="comment-loading"
          />
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white w-[50%] rounded-xl shadow-md border border-slate-200 overflow-hidden"
      >
        <ChatComponent groupId={userId.groupId} userId={userID} username={username} />
      </motion.div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-30 z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="bg-white rounded-lg p-8 shadow-lg relative max-w-[90%] w-full md:max-w-[40%]"
            >
              <button
                onClick={closeForm}
                className="absolute top-4 right-4 text-slate-500 hover:text-slate-700 transition-colors"
              >
                <X size={20} />
              </button>

              <h2 className="text-2xl font-bold mb-4 text-slate-800">Add new Member</h2>

              <form onSubmit={handleSubmit(addMember)}>
                <div className="mb-4">
                  <Input
                    label="Username"
                    className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    {...register("username", {
                      required: true,
                    })}
                  />
                </div>

                <div className="mb-4">
                  <Input
                    label="Email"
                    placeholder="Enter a valid email address"
                    className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    {...register("email", {
                      required: "Email is required",
                      pattern: {
                        value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/,
                        message: "Please enter a valid email address",
                      },
                    })}
                  />
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  className="bg-gradient-to-r from-blue-600 to-blue-500 text-white py-2 px-6 rounded-lg shadow-sm hover:shadow-md transition duration-300"
                >
                  Add Member
                </motion.button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isRes && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-30 z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="bg-white rounded-lg p-8 shadow-lg relative max-w-[90%] w-full md:max-w-[40%]"
            >
              <button
                onClick={closeRes}
                className="absolute top-4 right-4 text-slate-500 hover:text-slate-700 transition-colors"
              >
                <X size={20} />
              </button>

              <h2 className="text-2xl font-bold mb-4 text-slate-800">Add Resource</h2>

              <form onSubmit={handleSubmit(addResource)}>
                <div className="mb-4">
                  <Input
                    label="Title"
                    className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    {...register("title", {
                      required: true,
                    })}
                  />
                </div>

                <div className="mb-4">
                  <Input
                    label="URL"
                    placeholder="Attach link to your file"
                    type="file"
                    className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    {...register("url", {
                      required: true,
                    })}
                  />
                </div>

                <div className="mb-4">
                  <Input
                    label="Description"
                    placeholder="Keep it short"
                    className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    {...register("description", {
                      required: true,
                    })}
                  />
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  className="bg-gradient-to-r from-blue-600 to-blue-500 text-white py-2 px-6 rounded-lg shadow-sm hover:shadow-md transition duration-300"
                >
                  Add Resource
                </motion.button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="flex flex-col mt-[1vw] w-[45%]"
      >
        <div className="flex justify-between gap-[1vw] mb-6">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleMem}
            className={`py-3 px-6 rounded-lg shadow-sm transition duration-300 transform font-medium flex items-center gap-2 ${
              mem
                ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white"
                : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"
            }`}
          >
            <Users size={18} />
            Members
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleRes}
            className={`py-3 px-6 rounded-lg shadow-sm transition duration-300 transform font-medium flex items-center gap-2 ${
              res
                ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white"
                : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"
            }`}
          >
            <FileText size={18} />
            Resources
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate(`/whiteboard/${userId.groupId}`)}
            className="bg-gradient-to-r from-slate-600 to-slate-500 text-white py-3 px-6 rounded-lg shadow-sm hover:shadow-md transition duration-300 transform font-medium flex items-center gap-2"
          >
            <Whiteboard size={18} />
            WhiteBoard
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handlechat}
            className={`py-3 px-6 rounded-lg shadow-sm transition duration-300 transform font-medium flex items-center gap-2 ${
              showBot
                ? "bg-gradient-to-r from-green-600 to-green-500 text-white"
                : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"
            }`}
          >
            <MessageCircle size={18} />
            AI Chat
          </motion.button>
        </div>

        <div className="bg-white rounded-xl shadow-md border border-slate-200 p-4 mb-6 h-[calc(100vh-20vw)] overflow-hidden flex flex-col">
          <div className="flex-grow overflow-y-auto">
            {mem && (
              <AnimatePresence>
                <ul className="flex flex-col gap-4">
                  {members.map((mtr, index) => (
                    <motion.li
                      key={mtr._id || index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="transform transition hover:scale-[1.01]"
                    >
                      <Member username={mtr.username} profilePic={mtr.profilePic} email={mtr.email} />
                    </motion.li>
                  ))}
                </ul>
              </AnimatePresence>
            )}

            {res && !isRes && (
              <AnimatePresence>
                <ul className="flex flex-col items-center gap-4">
                  {resources.map((res, index) => (
                    <motion.li
                      key={res._id || index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="w-full transform transition hover:scale-[1.01]"
                    >
                      <Resources
                        title={res.title}
                        description={res.description}
                        url={res.url}
                        _id={res._id}
                        groupId={userId.groupId}
                      />
                    </motion.li>
                  ))}
                </ul>
              </AnimatePresence>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center">
          {mem && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="bg-gradient-to-r from-blue-600 to-blue-500 text-white font-medium py-3 px-6 rounded-lg shadow-sm hover:shadow-md transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-300 flex items-center gap-2"
              onClick={openForm}
            >
              <Plus size={18} />
              Add Members
            </motion.button>
          )}

          {res && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="bg-gradient-to-r from-blue-600 to-blue-500 text-white font-medium py-3 px-6 rounded-lg shadow-sm hover:shadow-md transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-300 flex items-center gap-2"
              onClick={openRes}
            >
              <Plus size={18} />
              Add Resource
            </motion.button>
          )}

          {userData.fullName === leader ? (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="bg-white border border-red-200 text-red-500 py-3 px-6 rounded-lg shadow-sm hover:bg-red-50 transition-all duration-300 flex items-center gap-2"
              onClick={deleteGroup}
            >
              <Trash2 size={18} />
              Delete Group
            </motion.button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="bg-white border border-red-200 text-red-500 py-3 px-6 rounded-lg shadow-sm hover:bg-red-50 transition-all duration-300 flex items-center gap-2"
              onClick={leaveGroup}
            >
              <LogOut size={18} />
              Leave Group
            </motion.button>
          )}
        </div>
      </motion.div>

      {/* ChatBot Modal */}
      <AnimatePresence>
        {showBot && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-30 z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="bg-white rounded-lg shadow-lg relative w-[90%] h-[80%] max-w-6xl overflow-hidden"
            >
              <button
                onClick={() => setShowBot(false)}
                className="absolute top-4 right-4 text-slate-500 hover:text-slate-700 transition-colors z-10"
              >
                <X size={24} />
              </button>
              
              <div className="h-full">
                <ChatBot groupId={userId.groupId} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Group