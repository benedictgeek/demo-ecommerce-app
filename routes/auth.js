const express = require('express');
const {
    check,
    body
} = require('express-validator');
const User = require('../models/user')

const authController = require('../controllers/auth');

const router = express.Router();

router.get('/login', authController.getLogin);

router.get('/signup', authController.getSignup);

router.post('/login',
[
    body('email','Email does not exist').isEmail().normalizeEmail(),
    body('password', 'Password should be of lenth 6 and alphanumeric').isLength(6).isAlphanumeric().trim(),
], authController.postLogin);

router.post('/signup',
    [
        body('email','Please enter a vaild email').isEmail().normalizeEmail().
        custom((value, {req}) => {
            return User.findOne({email: value})
            .then(user => {
                if(user) {
                    return Promise.reject('User already exists');
                }
            })
        }),
        body('password', 'Please enter a password 6 charaters long and alphanumeric').isAlphanumeric().isLength(6).trim(),
        body('confirmPassword', 'Password does not match').custom((value, {
            req
        }) => {
            if (value !== req.body.password) {
                throw new Error('Passwords does not match');
            }

            return true;
        }).trim(),
    ]

    , authController.postSignup);

router.post('/logout', authController.postLogout);

router.get('/reset', authController.getReset);

router.post('/reset', authController.postReset);

module.exports = router;