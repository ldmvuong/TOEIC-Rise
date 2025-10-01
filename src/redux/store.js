import { configureStore } from '@reduxjs/toolkit'
import accountReducer from './slices/accountSlide';
import testSetReducer from './slices/testsetSlide';


export const store = configureStore({
  reducer: {
    account: accountReducer,
    testSets: testSetReducer,
  },
})