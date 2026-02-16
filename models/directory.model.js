import {Schema,model} from 'mongoose'


const directorySchema = new Schema({
    name : {
        type:String,
        required:[true,"name field required"],
    },
    userId: {
        type:Schema.Types.ObjectId,
         ref:"User"
    },
    parentDirId: {
        type:Schema.Types.ObjectId,
        ref:"Directory"
    }
},{
    timestamps:true
}) 


const Directory = model(Directory,directorySchema)

export default Directory