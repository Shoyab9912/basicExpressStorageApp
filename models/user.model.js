import { Schema, model } from "mongoose"


const userSchema = new Schema({
    email: {
        type: String,
        required: [true, "Enter email field"],
        validate: {
            validator: function (v) {
                return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(v);
            },
            message: props => `${props.value} is not a valid email address!`
        }
    },
    password: {
        type: String,
        required: [true, "enter password"],
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
},{
    timestamps:true
})


const  User = model("User",userSchema)

export default User;