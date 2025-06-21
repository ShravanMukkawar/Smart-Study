import { createSlice } from "@reduxjs/toolkit";

// Retrieve stored user data from localStorage
const storedUserData = JSON.parse(localStorage.getItem("userData")) || {};
const storedStatus = localStorage.getItem("status") === "true"; // Convert string to boolean
const storedUserGroups = JSON.parse(localStorage.getItem("userGroups")) || [];

const initialState = {
    status: storedStatus,
    userData: storedUserData,
    userGroups: storedUserGroups
};
console.log("Inital State",initialState)
const slice = createSlice({
    name: "auth",
    initialState,
    reducers: {
        login: (state, action) => {
            state.status = true;
            state.userData = action.payload;
            localStorage.setItem("status", "true");
            localStorage.setItem("userData", JSON.stringify(action.payload));
        },
        logout: (state) => {
            state.status = false;
            state.userData = {};
            state.userGroups = [];
            localStorage.removeItem("status");
            localStorage.removeItem("userData");
            localStorage.removeItem("userGroups");
        },
        groups: (state, action) => {
            if (state.status) {
                state.userGroups = [...state.userGroups, action.payload];
                localStorage.setItem("userGroups", JSON.stringify(state.userGroups));
            }
        },
        delGroup: (state, action) => {
            if (state.status) {
                state.userGroups = state.userGroups.filter(
                    (grp) => action.payload.toString() !== grp.toString()
                );
                localStorage.setItem("userGroups", JSON.stringify(state.userGroups));
            }
        },
        updateUser: (state, action) => {
            state.userData = action.payload;
            localStorage.setItem("userData", JSON.stringify(action.payload));
        }
    }
});

export const { login, logout, groups, delGroup, updateUser } = slice.actions;
export default slice.reducer;
