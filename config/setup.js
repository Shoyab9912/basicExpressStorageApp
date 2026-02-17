
import connectDb, { client } from "./db.js"


const db = await connectDb();

const command = 'collMod'

await db.command({
    [command]: "users",
    validator: {
        $jsonSchema: {
            bsonType: 'object',
            required: [
                '_id',
                'email',
                'name',
                'password',
                'rootDirId'
            ],
            properties: {
                _id: {
                    bsonType: 'objectId'
                },
                email: {
                    bsonType: 'string',
                    pattern: '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+.[A-Za-z]{2,}$'
                },
                name: {
                    bsonType: 'string'
                },
                password: {
                    bsonType: 'string',
                    minimum: 3
                },
                rootDirId: {
                    bsonType: 'objectId'
                }
            },
            additionalProperties:false
        }
    },
})


await db.command({
    [command]: "files",
    validator: {
  $jsonSchema: {
    bsonType: 'object',
    required: [
      '_id',
      'extension',
      'name',
      'parentDirId',
      'userId'
    ],
    properties: {
      _id: {
        bsonType: 'objectId'
      },
      extension: {
        bsonType: 'string'
      },
      name: {
        bsonType: 'string'
      },
      parentDirId: {
        bsonType: 'objectId'
      },
      userId: {
        bsonType: 'objectId'
      }
    },
    additionalProperties : false
  }
}
}) 



await db.command({
    [command]: "directories",
    validator: {
  $jsonSchema: {
    bsonType: 'object',
    required: [
      '_id',
      'name',
      'parentDirId',
      'userId'
    ],
    properties: {
      _id: {
        bsonType: 'objectId'
      },
      name: {
        bsonType: 'string'
      },
      parentDirId: {
        bsonType: [
          'null',
          'objectId'
        ]
      },
      userId: {
        bsonType: 'objectId'
      }
    },
    additionalProperties : false
  }
}
})


client.close()