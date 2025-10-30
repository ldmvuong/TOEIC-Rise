import { configureStore } from '@reduxjs/toolkit'
import accountReducer from './slices/accountSlide';
import testSetReducer from './slices/testsetSlide';
import testReducer from './slices/testSlide';
import userReducer from './slices/userSlide';


export const store = configureStore({
  reducer: {
    account: accountReducer,
    testSets: testSetReducer,
    tests: testReducer,
    users: userReducer,
  },
})