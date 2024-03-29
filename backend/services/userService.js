const User = require('../model/userModel');
const ErrorHandler = require('../utils/errorHandler');
const sendJWTToken = require('../utils/jwtToken');
const sendEmail = require('../utils/sendEmail');
const crypto = require('crypto');
const cloudinary = require('cloudinary').v2;

class UserService {

    /**
     * Persit the new user into the database.
     * 
     * @param {HTTP} req, a request object, body of which will be having new user details.
     * @param {HTTP} res
     * @param {function} next
     * 
     * @return an appropriate success response having user details, if user created successfully
     * or an appropriate failure response, if any error occurs.
     */
    static createUser = async (req, res, next) =>  {
        const { name, email, password, avatar } = req.body;
        let myCloud;
        if(avatar !== '') {
            myCloud = await cloudinary.uploader.upload(avatar, {
                folder: "avatars",
                width: 150,
                crop: "scale",
            });
        }

        /*
            Persist user in db, if any error occurs while saving, send appropriate response. The error
            handling would be done at the place wherever this function would actually be called.
        */
        const user = await User.create({ 
            name, email, password,
            avatar: {
                public_id: avatar == '' ? 'none' : myCloud.public_id,
                url: avatar == '' ? 'none' : myCloud.secure_url,
            },
        });
        
        // Otherwise generate the token return success response.
        sendJWTToken(user, 201, res);
    }

    /**
     * Login User.
     * 
     * @param {HTTP} req 
     * @param {HTTP} res 
     * @param {function} next 
     * 
     * @return an appropriate success response having user details, if user logged in successfully
     * or an appropriate failure response, if any error occurs.
     */
    static loginUser = async (req, res, next) => {

        const { email, password } = req.body;

        // Checking if user has provided email and password both.
        if(!email || !password)
            return next(new ErrorHandler(400, "Please enter Email and Password"));
        
        // Check if the provided email exists.
        const foundUser = await User.findOne({ email }).select("+password");

        if(!foundUser)
            return next(new ErrorHandler(401, "Invalid credentials! Please try again"));
        
        // Check if the entered password is correct or not.
        const isPasswordMatched = await foundUser.comparePassword(password);
        
        if(!isPasswordMatched)
            return next(new ErrorHandler(401, "Invalid credentials, Please try again"));
        
        // Otherwise return success response
        return sendJWTToken(foundUser, 200, res);
    }

    /**
     * Logout User.
     * 
     * @param {HTTP} req 
     * @param {HTTP} res 
     * @param {function} next 
     * 
     * @return 
     */
    static logoutUser = async (req, res, next) => {

        res.cookie("token", null, {
            expires: new Date(Date.now()),
            httpOnly: true
        });

        res.status(200).json({
            success: true,
            message: "Logged out successfully!"
        });
    }

    /**
     * Forgot Password: send the password reset link to the user. Generates the reset token and then 
     * sends an email to the respective user.
     * 
     * @param {HTTP} req 
     * @param {HTTP} res 
     * @param {function} next 
     */
    static forgotPassword = async(req, res, next) => {

        const user = await User.findOne({email: req.body.email});
        if(!user)
            return next(new ErrorHandler(404, "User not found!"));
        
        // Get reset password token.
        const resetToken = user.getResetPasswordToken();
        
        // Save this user into database.
        await user.save({ validateBeforeSave: false });

        const resetPasswordURL = `${req.protocol}://${req.get("host")}/api/v1/password/reset/${resetToken}`;

        const message = `Your password reset token is: \n\n ${resetPasswordURL} \n\n If you haven't requested it, then please ignore.`

        try {
            await sendEmail({
                email: user.email,
                subject: "E-Commerce Reset Password",
                message
            });

            res.status(200).json({
                success: true,
                message: `Email sent to ${user.email} successfully`
            })

        } catch (error) {
            user.resetPasswordToken = undefined;
            user.resetPasswordExpire = undefined;

            await user.save({ validateBeforeSave: false });

            return next(new ErrorHandler(500, error.message));
        }
    }

    /**
     * Resets the user password. Checks if the token matches and has not expired, then only updates the user 
     * password and sends the appropriate success or error response.
     * 
     * @param {req} req 
     * @param {res} res 
     * @param {function} next 
     */
    static resetPassword = async (req, res, next) => {
        /*
            Converting the token received as a param in URL to an appropriate hash so that it could be 
            comapred with the one already present in database.
        */
        const resetPasswordToken = crypto
                            .createHash("sha256")
                            .update(req.params.token)
                            .digest("hex");

        const user = await User.findOne({
            resetPasswordToken,
            resetPasswordExpire: { $gt: Date.now() }
        });

        if(!user)
            return next(new ErrorHandler(400, "Reset Password Token is invalid or has expired!"));
        
        if(req.body.newPassword !== req.body.confirmNewPassword) 
            return next(new ErrorHandler(400, "New Password and Confirm Password does not match!"));
        
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;

        user.password = req.body.newPassword;

        await user.save();

        sendJWTToken(user, 200, res);
    }

    /**
     * Get user details.
     * 
     * @param {HTTP} req 
     * @param {HTTP} res 
     * @param {function} next 
     */
    static getUserDetails = async (req, res, next) => {
        const user = await User.findById(req.user.id);
        
        res.status(200).json({
            success: true,
            user
        });
    }

    /**
     * Update user password. Checks if the user password matches the existing password then only updates
     * the user's password and sends the appropriate success or failure response.
     * 
     * @param {HTTP} req 
     * @param {HTTP} res 
     * @param {function} next 
     */
    static updatePassword = async (req, res, next) => {
        const user = await User.findById(req.user.id).select("+password");
        const currentPassword = req.body.currentPassword;

        const isPasswordMatched = await user.comparePassword(currentPassword);

        if(!isPasswordMatched)
            return next(new ErrorHandler(422, "Current Password is Invalid!"));
        
        if(req.body.newPassword !== req.body.confirmNewPassword) 
            return next(new ErrorHandler(400, "New Password and Confirm Password does not match!"));
        
        user.password = req.body.newPassword;
        
        await user.save();

        sendJWTToken(user, 200, res);
    }

    /**
     * Update the user profile.
     * 
     * @param {req} req 
     * @param {res} res 
     * @param {function} next 
     * 
     * @return success response after finding the user and updating the profile details.
     */
    static updateProfile = async (req, res, next) => {
        const { name, email } = req.body;
        const newUserData = { name, email }

        // TODO: will add cloudinary later (for updating avatar images)

        await User.findByIdAndUpdate(req.user.id, newUserData, {
            new: true,
            runValidators: true,
            useFindAndModify: false       
        });

        res.status(200).json({
            "success": true
        });
    }

    /**
     * Return all users(Admin only).
     * 
     * @param {HTTP} req 
     * @param {HTTP} res 
     * @param {function} next
     * 
     * @return success response after fetching all the users.
     */
    static getAllUsers = async (req, res, next) => {
        const users = await User.find();
        res.status(200).json({
            success: true,
            users
        })
    }

    /**
     * Return a user details with the given user id(Admin only).
     * 
     * @param {HTTP} req 
     * @param {HTTP} res 
     * @param {function} next 
     * 
     * @return an appropriate success or failure response.
     */
    static getSingleUser = async (req, res, next) => {
        const user = await User.findById(req.params.id);

        if(!user)
            return next(404, `User with id ${req.params.id} not found!`);
        
        res.status(200).json({
            success: true,
            user
        });
    }

    /**
     * Update the user role(Admin only).
     * 
     * @param {req} req 
     * @param {res} res 
     * @param {function} next 
     * 
     * @return success response if user role has been successfully updated and a failure response if user
     * does not exists.
     */
    static updateUserRole = async (req, res, next) => {

        // Check if the role field has been provided in JSON or not.
        if(!req.body.hasOwnProperty("role"))
            return next(new ErrorHandler(422, "Role not entered!"));

        const user = User.findById(req.params.id);

        if(!user)
            return next(new ErrorHandler(404, `User with id ${req.params.id} not found!`));

        // Check if the id entered in the URL is same as the current user's id.
        if(req.user.id === req.params.id)
            return next(new ErrorHandler(405, "You cannot change your own role!"));

        const { role } = req.body;
        const newUserData = { role }

        await User.findByIdAndUpdate(req.params.id, newUserData, {
            new: true,
            runValidators: true,
            useFindAndModify: false       
        });

        res.status(200).json({
            "success": true
        });
    }

    /**
     * Delete user(Admin only).
     * 
     * @param {req} req 
     * @param {res} res 
     * @param {function} next 
     * 
     * @return an appropriate success or failure response.
     */
    static deleteUser = async (req, res, next) => {
        const user = await User.findById(req.params.id);
        
        if(!user)
            return next(new ErrorHandler(404, `User with id ${req.params.id} not found!`));

        // TODO: will remove cloudinary later (for updating avatar images)
        
        await user.deleteOne();

        res.status(200).json({
            "success": true
        });
    }
}

module.exports = UserService;