import {
    registerUser,
    logoutUser,
    refreshAccessToken,
    loginUser,
    getCurrentUser,
    getGroups,
    getLeaderInfo,
    updateProfile,
    profile,
    search,
    updateProfileImage
} from "../controllers/user.controller.js"
import { verifyJWT } from "../middlewares/auth.middleware.js"
import { upload } from "../middlewares/multer.middleware.js"

import { Router } from "express"

const router = Router()

router.route('/register').post(upload.single('profilePic'), registerUser)
router.route('/signIn').post(loginUser)
router.route('/signOut').post(verifyJWT, logoutUser)
router.route('/getUser').get(verifyJWT, getCurrentUser)
router.route('/refreshToken').post(verifyJWT, refreshAccessToken)
router.route('/getGroups').get(verifyJWT, getGroups)
// router.route('/getLeader').get(verifyJWT, getLeader)
router.route('/getLeader').post(verifyJWT, getLeaderInfo)
router.route('/update-profile/:userid').put(updateProfile)
router.route('/upload-profile-picture').post(upload.single('profilePicture'),updateProfileImage)
router.route('/profile').get(verifyJWT, profile)
router.route('/search').get(search)

export default router