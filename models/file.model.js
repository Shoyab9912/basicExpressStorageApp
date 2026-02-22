import { Schema, model } from "mongoose"


const fileSchema = new Schema({
    extension: {
        type: String,
        required: [true, "extension required"]
    },
    name: {
        type: String,
        required: [true, "name field required"],
    },
    parentDirId: {
        type: Schema.Types.ObjectId,
        ref: "Directory"
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User"
    }
})


const File = model("File", fileSchema)
export default File;