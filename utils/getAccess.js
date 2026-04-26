


const getAccess = (userId, resource) => {
    if (resource.userId.equals(userId)) return 'owner';

    const res = resource.sharedWith.find(r => r.userId.equals(userId));

    if (res) {
        return res.permission
    }

    return null

}


export default getAccess