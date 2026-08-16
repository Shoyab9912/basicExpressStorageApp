const getAccess = (userId, resource, token = null) => {
  if (resource.userId.equals(userId)) return "owner";

  const res = resource.sharedWith.find((r) => r.userId.equals(userId));

  if (res) {
    return res.permission;
  }

  if (token && res.shareLink?.token === token) {
    if(res.shareLink.expiresAt < Date.now() ) {
        return null
    }
    return res.shareLink.permission
  }

  return null;
};

export default getAccess;
