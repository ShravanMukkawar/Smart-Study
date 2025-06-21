import { configureStore } from '@reduxjs/toolkit';
import authReducer from './Slice.js'; 

const store = configureStore({
    reducer: {
        auth: authReducer // Use correct naming
    }
});

export default store;
