import { configureStore } from '@reduxjs/toolkit'
import accountReducer from './slices/accountSlide';
import testSetReducer from './slices/testsetSlide';
import speakingTestSetReducer from './slices/speakingTestSetSlide';
import writingTestSetReducer from './slices/writingTestSetSlide';
import testReducer from './slices/testSlide';
import userReducer from './slices/userSlide';


export const store = configureStore({
  reducer: {
    account: accountReducer,
    testSets: testSetReducer,
    speakingTestSets: speakingTestSetReducer,
    writingTestSets: writingTestSetReducer,
    tests: testReducer,
    users: userReducer,
  },
})