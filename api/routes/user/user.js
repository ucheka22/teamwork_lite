import express from 'express';
import verifyToken from '../../config/verifyToken';
import userController from '../../controller/user/user';
const router = express.Router();

//@ route POST /api/v1/auth/create-user
//@ desc creates accout for user
// @ access public
router.post('/create-user', verifyToken, userController.createAccount);
//@ route POST /api/v1/auth/signin
//@ desc log in  user
// @ access public
router.post('/signin', userController.signInUser);

export default router;
