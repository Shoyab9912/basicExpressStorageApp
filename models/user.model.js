import { Schema, model } from "mongoose"
import bcrypt from "bcryptjs"

const userSchema = new Schema({
    email: {
        type: String,
        required: [true, "Enter email field"],
        unique: true,
        validate: {
            validator: function (v) {
                return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(v);
            },
            message: props => `${props.value} is not a valid email address!`
        }
    },
    password: {
        type: String,
        // required: [true, "enter password"],
        minLength: 3
    },
    name: {
        type: String,
        required: [true, "name field required"],
    },
    rootDirId: {
        type: Schema.Types.ObjectId,
        ref: "Directory"
    },
    picture : {
        type:"String",
        default:"https://cdn-icons-png.flaticon.com/512/149/149071.png"
    },
    loginProvider : {
        type:"String",
        enum : ["local","google","github"],
        default:"local"
    },
    role : {
        type:String,
        enum : ["User","Admin","Manager"],
        default:"User"
    }
})

userSchema.pre("save", async function () {
    if (this.isModified("password"))  {
        this.password = await bcrypt.hash(this.password, 10)
    }
})

userSchema.methods.verifyPassword = async function (password) {
    return await bcrypt.compare(password,this.password)
}

const User = model("User", userSchema)

export default User;